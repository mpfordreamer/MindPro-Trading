import { apiRoute } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { must } from '@/lib/http';
import { adminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export const DELETE = apiRoute(async ({ user, requestId, ip }) => {
  must(await adminClient().from('notification_channels').update({ telegram_chat_id: null, telegram_link_hash: null, telegram_link_expires: null }).eq('user_id', user.id).select('user_id'), 'notif.tg.unlink');
  await logAudit({ userId: user.id, action: 'notifications.telegram.unlinked', requestId, ip });
  return { data: { linked: false } };
});
