import { apiRoute } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { must } from '@/lib/http';
import { hashCode, newLinkCode } from '@/lib/linkCode';
import { adminClient } from '@/lib/supabase/admin';
import { requireTelegram } from '@/lib/telegram';

export const runtime = 'nodejs';
const TTL_MS = 15 * 60_000;

/** Kode sekali pakai (15 menit). User membuka deep link & menekan Start → webhook menautkan chat ke akun ini. Hanya hash yang disimpan. */
export const POST = apiRoute(async ({ user, requestId, ip }) => {
  const { username } = requireTelegram();
  const code = newLinkCode();
  const expires = new Date(Date.now() + TTL_MS).toISOString();
  must(await adminClient().from('notification_channels').upsert({ user_id: user.id, telegram_link_hash: hashCode(code), telegram_link_expires: expires, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('user_id'), 'notif.tg.link');
  await logAudit({ userId: user.id, action: 'notifications.telegram.link_requested', requestId, ip });
  return { data: { deepLink: `https://t.me/${username}?start=${code}`, expiresAt: expires } };
});
