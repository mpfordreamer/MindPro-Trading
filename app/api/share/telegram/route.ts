import { apiRoute } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { must, parseBody } from '@/lib/http';
import { buildShareText, type ShareSource } from '@/lib/shareFormat';
import { adminClient } from '@/lib/supabase/admin';
import { sendTelegram } from '@/lib/telegram';
import { ShareSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export const POST = apiRoute(async ({ req, sb, user, requestId, ip }) => {
  const { analysisId, note } = await parseBody(req, ShareSchema, 2_000);
  const a = must(await sb.from('analyses').select('result').eq('id', analysisId).maybeSingle(), 'share.analysis');
  if (!a) throw new AppError('NOT_FOUND', 'Analisa tidak ditemukan.', 404, false);
  const ch = must(await sb.from('notification_channels').select('telegram_chat_id').eq('user_id', user.id).maybeSingle(), 'share.channel');
  if (!ch?.telegram_chat_id) throw new AppError('INVALID_REQUEST', 'Telegram belum terhubung. Hubungkan di Pengaturan Notifikasi.', 400, false);

  const r = await sendTelegram(ch.telegram_chat_id, buildShareText(a.result as ShareSource, note));
  if (!r.ok) {
    if (r.permanent) await adminClient().from('notification_channels').update({ telegram_chat_id: null }).eq('user_id', user.id);
    throw new AppError('DELIVERY_FAILED', r.permanent ? 'Bot diblokir/chat tidak ditemukan. Hubungkan ulang Telegram.' : 'Gagal mengirim ke Telegram. Coba lagi.', 502, !r.permanent);
  }
  await logAudit({ userId: user.id, action: 'share.telegram', entity: analysisId, requestId, ip });
  return { data: { sent: true } };
}, { rateLimit: 'share' });
