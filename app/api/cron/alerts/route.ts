import { alertMessage } from '@/lib/alertMessages';
import { evaluateTrade, windowSince } from '@/lib/alertEngine';
import { assertCron } from '@/lib/cronAuth';
import { sendDiscord } from '@/lib/discord';
import { errorResponse } from '@/lib/errors';
import { fetchCandles } from '@/lib/marketData';
import { sendTelegram, telegramConfigured } from '@/lib/telegram';
import { adminClient } from '@/lib/supabase/admin';
import type { Timeframe } from '@/lib/validators';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_TRADES = 200;
const WATCH_TF: Timeframe = '15M'; // 300 candle ≈ 75 jam riwayat sentuhan
interface Trade { id: string; user_id: string; direction: 'LONG' | 'SHORT'; entry_price: number; stop_loss: number; take_profit: number; created_at: string; analysis: { asset: string; timeframe: string; market_type: string } | { asset: string; timeframe: string; market_type: string }[] | null }
interface Chan { user_id: string; telegram_chat_id: number | null; discord_webhook_url: string | null }

/**
 * Dijalankan tiap ~5 menit (Vercel Pro cron / scheduler eksternal). Untuk tiap trade terbuka: ambil candle (ter-cache),
 * evaluasi SL/TP, "klaim" alert dengan INSERT (unique journal+kind+channel) lalu kirim. Gagal kirim → klaim dilepas agar dicoba lagi.
 */
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertCron(req);
    const sb = adminClient();
    const { data: trades, error } = await sb.from('trade_journal')
      .select('id,user_id,direction,entry_price,stop_loss,take_profit,created_at,analysis:analyses(asset,timeframe,market_type)').eq('status', 'open').order('created_at').limit(MAX_TRADES);
    if (error) throw error;
    const list = (trades ?? []) as unknown as Trade[];
    const userIds = [...new Set(list.map((t) => t.user_id))];
    const { data: chans } = userIds.length
      ? await sb.from('notification_channels').select('user_id,telegram_chat_id,discord_webhook_url').in('user_id', userIds).eq('alerts_enabled', true)
      : { data: [] };
    const byUser = new Map(((chans ?? []) as Chan[]).map((c) => [c.user_id, c]));

    const candleCache = new Map<string, Awaited<ReturnType<typeof fetchCandles>>['candles'] | null>();
    const stats = { trades: list.length, evaluated: 0, sent: 0, skippedNoChannel: 0, priceErrors: 0, deliveryErrors: 0 };

    for (const t of list) {
      const ch = byUser.get(t.user_id);
      const a = Array.isArray(t.analysis) ? t.analysis[0] : t.analysis;
      const hasTg = !!ch?.telegram_chat_id && telegramConfigured();
      if (!ch || !a || (!hasTg && !ch.discord_webhook_url)) { stats.skippedNoChannel++; continue; }

      const key = `${a.market_type}|${a.asset}`;
      if (!candleCache.has(key)) candleCache.set(key, await fetchCandles({ asset: a.asset, marketType: a.market_type, timeframe: WATCH_TF, limit: 300 }).then((r) => r.candles).catch(() => null));
      const candles = candleCache.get(key);
      if (!candles) { stats.priceErrors++; continue; }

      const w = windowSince(candles, Math.floor(Date.parse(t.created_at) / 1000));
      if (!w) continue;
      const plan = { direction: t.direction, entry: Number(t.entry_price), stopLoss: Number(t.stop_loss), takeProfit: Number(t.take_profit) };
      const kinds = evaluateTrade(plan, w);
      stats.evaluated++;
      const bothHit = kinds.includes('tp_hit') && kinds.includes('sl_hit');

      for (const kind of kinds) {
        const msg = alertMessage(kind, { asset: a.asset, timeframe: a.timeframe, direction: t.direction, entry: plan.entry, stopLoss: plan.stopLoss, takeProfit: plan.takeProfit, price: w.last, bothHit });
        const level = kind.startsWith('tp') ? plan.takeProfit : plan.stopLoss;
        const channels: ('telegram' | 'discord')[] = [...(hasTg ? ['telegram' as const] : []), ...(ch.discord_webhook_url ? ['discord' as const] : [])];
        for (const channel of channels) {
          const claim = await sb.from('alerts').insert({
            user_id: t.user_id, journal_id: t.id, asset: a.asset, kind, trigger_price: level, channel, status: 'triggered',
            direction: (kind.startsWith('tp') ? t.direction === 'LONG' : t.direction === 'SHORT') ? 'above' : 'below', triggered_at: new Date().toISOString(),
          });
          if (claim.error) { if (claim.error.code !== '23505') console.error(`[${requestId}] claim`, claim.error); continue; } // 23505 = sudah pernah terkirim
          const r = channel === 'telegram'
            ? await sendTelegram(ch.telegram_chat_id!, `${msg.title}\n${msg.body}`)
            : await sendDiscord(ch.discord_webhook_url!, { username: 'MarketMind AI', allowed_mentions: { parse: [] }, embeds: [{ title: msg.title.slice(0, 250), description: msg.body.slice(0, 3900), color: kind.endsWith('_hit') ? (kind === 'tp_hit' ? 0x10b981 : 0xef4444) : 0xf59e0b }] });
          if (r.ok) { stats.sent++; continue; }
          stats.deliveryErrors++;
          await sb.from('alerts').delete().eq('journal_id', t.id).eq('kind', kind).eq('channel', channel); // lepas klaim → coba lagi run berikutnya
          if (r.permanent) await sb.from('notification_channels').update(channel === 'telegram' ? { telegram_chat_id: null } : { discord_webhook_url: null }).eq('user_id', t.user_id);
        }
      }
    }
    return Response.json({ data: stats }, { headers: { 'x-request-id': requestId } });
  } catch (e) {
    return errorResponse(e, requestId);
  }
}
