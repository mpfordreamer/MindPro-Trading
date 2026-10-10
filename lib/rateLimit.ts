import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from './redis';
import { env } from './env';
import { AppError } from './errors';

type Kind = 'analyze' | 'chat' | 'market' | 'journal' | 'share';
const CFG: Record<Kind, { limit: number; window: `${number} ${'m' | 'h'}` }> = {
  analyze: { limit: 10, window: '1 h' },
  chat: { limit: 60, window: '1 h' },
  share: { limit: 20, window: '1 h' }, // share Discord/Telegram + export PDF
  journal: { limit: 120, window: '1 h' },
  market: { limit: 300, window: '1 h' }, // chart polling 30 dtk ≈ 120/jam per tab
};
const IP_MULTIPLIER = 3;

const cache = new Map<string, Ratelimit>();
function limiter(kind: Kind, scope: 'user' | 'ip'): Ratelimit {
  const key = `${kind}:${scope}`;
  let l = cache.get(key);
  if (!l) {
    l = new Ratelimit({
      redis: getRedis()!,
      limiter: Ratelimit.slidingWindow(CFG[kind].limit * (scope === 'ip' ? IP_MULTIPLIER : 1), CFG[kind].window),
      prefix: `mm:${key}`,
    });
    cache.set(key, l);
  }
  return l;
}

export async function enforceRateLimit(kind: Kind, userId: string, ip: string) {
  const e = env();
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV === 'production') throw new AppError('CONFIG_ERROR', 'Rate limiter belum dikonfigurasi.', 500, false);
    console.warn('[rateLimit] Upstash tidak diset — dilewati (hanya development).');
    return;
  }
  for (const [scope, id] of [['user', userId], ['ip', ip]] as const) {
    const r = await limiter(kind, scope).limit(id);
    if (!r.success) {
      const retry = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
      throw new AppError('RATE_LIMITED', `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.`, 429, true, undefined, retry);
    }
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}
