import { apiRoute } from '@/lib/api';
import { sendDiscord } from '@/lib/discord';
import { AppError } from '@/lib/errors';
import { must, parseBody } from '@/lib/http';
import { sendTelegram } from '@/lib/telegram';
import { TestChannelSchema } from '@/lib/validators';
import { DISCLAIMER } from '@/lib/alertMessages';

export const runtime = 'nodejs';

export const POST = apiRoute(async ({ req, sb, user }) => {
  const { channel } = await parseBody(req, TestChannelSchema, 500);
  const ch = must(await sb.from('notification_channels').select('telegram_chat_id,discord_webhook_url').eq('user_id', user.id).maybeSingle(), 'notif.test');
  const text = `✅ Tes notifikasi MarketMind AI berhasil.\n${DISCLAIMER}`;
  const r = channel === 'telegram'
    ? (ch?.telegram_chat_id ? await sendTelegram(ch.telegram_chat_id, text) : null)
    : (ch?.discord_webhook_url ? await sendDiscord(ch.discord_webhook_url, { username: 'MarketMind AI', content: text, allowed_mentions: { parse: [] } }) : null);
  if (!r) throw new AppError('INVALID_REQUEST', `${channel === 'telegram' ? 'Telegram' : 'Discord'} belum dikonfigurasi.`, 400, false);
  if (!r.ok) throw new AppError('DELIVERY_FAILED', `Tes gagal: ${r.reason}.`, 502, !r.permanent);
  return { data: { sent: true } };
}, { rateLimit: 'share' });
