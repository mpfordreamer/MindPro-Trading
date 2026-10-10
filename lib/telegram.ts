import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { safeFetch, type SendResult } from './delivery';
import { env } from './env';
import { AppError } from './errors';

export function requireTelegram() {
  const e = env();
  if (!e.TELEGRAM_BOT_TOKEN || !e.TELEGRAM_BOT_USERNAME || !e.TELEGRAM_WEBHOOK_SECRET)
    throw new AppError('CONFIG_ERROR', 'Telegram belum dikonfigurasi di server.', 503, false);
  return { token: e.TELEGRAM_BOT_TOKEN, username: e.TELEGRAM_BOT_USERNAME, secret: e.TELEGRAM_WEBHOOK_SECRET };
}
export const telegramConfigured = () => { const e = env(); return !!(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_BOT_USERNAME && e.TELEGRAM_WEBHOOK_SECRET); };

/** Teks polos (tanpa parse_mode) → tidak ada injeksi markup dari konten AI/user. Token tidak pernah di-log. */
export async function sendTelegram(chatId: number | string, text: string): Promise<SendResult> {
  const { token } = requireTelegram();
  try {
    const res = await safeFetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4096), disable_web_page_preview: true }),
    });
    if (res.ok) return { ok: true };
    const j = await res.json().catch(() => ({}));
    const permanent = res.status === 403 || (res.status === 400 && /chat not found|user is deactivated/i.test(j.description ?? ''));
    return { ok: false, permanent, reason: `Telegram ${res.status}` };
  } catch { return { ok: false, permanent: false, reason: 'Telegram tidak dapat dihubungi' }; }
}

export function verifyTelegramSecret(req: Request): boolean {
  const want = Buffer.from(requireTelegram().secret);
  const got = Buffer.from(req.headers.get('x-telegram-bot-api-secret-token') ?? '');
  return got.length === want.length && timingSafeEqual(got, want);
}
