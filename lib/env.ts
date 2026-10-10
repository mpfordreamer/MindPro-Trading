import 'server-only';
import { z } from 'zod';
import { AppError } from './errors';

const schema = z.object({
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().min(3).default('gemini-3-flash-preview'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  TELEGRAM_BOT_TOKEN: z.string().min(20).optional(),
  TELEGRAM_BOT_USERNAME: z.string().min(3).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).regex(/^[A-Za-z0-9_-]+$/).optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  TWELVEDATA_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;
export function env() {
  if (cached) return cached;
  const r = schema.safeParse(process.env);
  if (!r.success) {
    console.error('Env tidak valid:', r.error.issues.map((i) => i.path.join('.')));
    throw new AppError('CONFIG_ERROR', 'Konfigurasi server belum lengkap.', 500, false);
  }
  return (cached = r.data);
}
