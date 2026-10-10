import { apiRoute } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { isValidDiscordWebhook, maskWebhook } from '@/lib/discordUrl';
import { AppError } from '@/lib/errors';
import { must, parseBody } from '@/lib/http';
import { adminClient } from '@/lib/supabase/admin';
import { DiscordWebhookSchema } from '@/lib/validators';

export const runtime = 'nodejs';

/** Simpan/hapus webhook Discord pribadi. URL hanya diterima bila host & format persis webhook Discord. */
export const PUT = apiRoute(async ({ req, user, requestId, ip }) => {
  const { webhookUrl } = await parseBody(req, DiscordWebhookSchema, 1_000);
  if (webhookUrl !== null && !isValidDiscordWebhook(webhookUrl))
    throw new AppError('INVALID_REQUEST', 'URL bukan webhook Discord yang valid (https://discord.com/api/webhooks/…).', 400, false);
  must(await adminClient().from('notification_channels').upsert({ user_id: user.id, discord_webhook_url: webhookUrl, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('user_id'), 'notif.discord');
  await logAudit({ userId: user.id, action: webhookUrl ? 'notifications.discord.set' : 'notifications.discord.removed', requestId, ip });
  return { data: { personalConfigured: !!webhookUrl, masked: webhookUrl ? maskWebhook(webhookUrl) : null } };
});
