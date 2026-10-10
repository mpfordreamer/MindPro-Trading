import 'server-only';
import { safeFetch, type SendResult } from './delivery';
import { isValidDiscordWebhook } from './discordUrl';

/** Validasi ulang URL pada setiap kirim (defense in depth), meski sudah divalidasi saat disimpan. */
export async function sendDiscord(webhookUrl: string, payload: unknown): Promise<SendResult> {
  if (!isValidDiscordWebhook(webhookUrl)) return { ok: false, permanent: true, reason: 'URL webhook tidak valid' };
  try {
    const res = await safeFetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) return { ok: true };
    return { ok: false, permanent: res.status === 401 || res.status === 404, reason: `Discord ${res.status}` };
  } catch { return { ok: false, permanent: false, reason: 'Discord tidak dapat dihubungi' }; }
}
