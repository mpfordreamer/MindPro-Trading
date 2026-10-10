import { apiRoute } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { maskWebhook } from '@/lib/discordUrl';
import { env } from '@/lib/env';
import { must, parseBody } from '@/lib/http';
import { telegramConfigured } from '@/lib/telegram';
import { adminClient } from '@/lib/supabase/admin';
import { NotificationPrefsSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export const GET = apiRoute(async ({ sb, user }) => {
  const ch = must(await sb.from('notification_channels').select('telegram_chat_id,discord_webhook_url,alerts_enabled').eq('user_id', user.id).maybeSingle(), 'notif.get');
  return { data: {
    telegram: { available: telegramConfigured(), linked: !!ch?.telegram_chat_id },
    discord: { personalConfigured: !!ch?.discord_webhook_url, masked: ch?.discord_webhook_url ? maskWebhook(ch.discord_webhook_url) : null, sharedAvailable: !!env().DISCORD_WEBHOOK_URL },
    alertsEnabled: ch?.alerts_enabled ?? true,
  } };
});

export const PATCH = apiRoute(async ({ req, user, requestId, ip }) => {
  const { alertsEnabled } = await parseBody(req, NotificationPrefsSchema, 500);
  must(await adminClient().from('notification_channels').upsert({ user_id: user.id, alerts_enabled: alertsEnabled, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('user_id'), 'notif.prefs');
  await logAudit({ userId: user.id, action: 'notifications.prefs', requestId, ip, meta: { alertsEnabled } });
  return { data: { alertsEnabled } };
});
