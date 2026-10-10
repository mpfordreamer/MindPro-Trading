import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { env } from './env';
import { AppError } from './errors';

/** Vercel Cron / scheduler eksternal mengirim `Authorization: Bearer <CRON_SECRET>`. */
export function assertCron(req: Request): void {
  const secret = env().CRON_SECRET;
  if (!secret) throw new AppError('CONFIG_ERROR', 'CRON_SECRET belum diset.', 500, false);
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new AppError('UNAUTHORIZED', 'Tidak diizinkan.', 401, false);
}
