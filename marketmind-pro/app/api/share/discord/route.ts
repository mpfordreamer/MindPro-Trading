import { apiRoute } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { sendDiscord } from '@/lib/discord';
import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { must, parseBody } from '@/lib/http';
import { buildAnalysisEmbed, type ShareSource } from '@/lib/shareFormat';
import { adminClient } from '@/lib/supabase/admin';
import { ShareSchema } from '@/lib/validators';

export const runtime = 'nodejs';

/** Konten dibangun SERVER dari analisa milik user — user tidak bisa mengirim teks bebas (hanya catatan ≤280 karakter, mention diblokir). */
export const POST = apiRoute(async ({ req, sb, user, requestId, ip }) => {
  const { analysisId, note } = await parseBody(req, ShareSchema, 2_000);
  const a = must(await sb.from('analyses').select('result').eq('id', analysisId).maybeSingle(), 'share.analysis');
  if (!a) throw new AppError('NOT_FOUND', 'Analisa tidak ditemukan.', 404, false);

  const ch = must(await sb.from('notification_channels').select('discord_webhook_url').eq('user_id', user.id).maybeSingle(), 'share.channel');
  const personal: string | null = ch?.discord_webhook_url ?? null;
  const url = personal ?? env().DISCORD_WEBHOOK_URL ?? null;
  if (!url) throw new AppError('INVALID_REQUEST', 'Discord belum dikonfigurasi. Tambahkan webhook Anda di Pengaturan Notifikasi.', 400, false);

  const r = await sendDiscord(url, buildAnalysisEmbed(a.result as ShareSource, note));
  if (!r.ok) {
    if (r.permanent && personal) await adminClient().from('notification_channels').update({ discord_webhook_url: null }).eq('user_id', user.id);
    throw new AppError('DELIVERY_FAILED', r.permanent && personal ? 'Webhook Discord tidak valid/telah dihapus. Atur ulang di Pengaturan.' : 'Gagal mengirim ke Discord. Coba lagi.', 502, !r.permanent);
  }
  await logAudit({ userId: user.id, action: 'share.discord', entity: analysisId, requestId, ip, meta: { personal: !!personal } });
  return { data: { sent: true, via: personal ? 'personal' : 'shared' } };
}, { rateLimit: 'share' });
