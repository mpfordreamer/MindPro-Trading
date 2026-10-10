import { z } from 'zod';
import { AppError, errorResponse } from '@/lib/errors';
import { requireUser } from '@/lib/http';
import { fetchCandles } from '@/lib/marketData';
import { clientIp, enforceRateLimit } from '@/lib/rateLimit';
import { MARKET_TYPES, TIMEFRAMES } from '@/lib/validators';

export const runtime = 'nodejs';

const Query = z.object({
  asset: z.string().trim().min(2).max(24).regex(/^[A-Za-z0-9/._:-]+$/),
  marketType: z.enum(MARKET_TYPES),
  timeframe: z.enum(TIMEFRAMES),
  limit: z.coerce.number().int().min(2).max(500).default(300),
});

export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    const user = await requireUser();
    await enforceRateLimit('market', user.id, clientIp(req));
    const q = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!q.success) throw new AppError('INVALID_REQUEST', 'Parameter tidak valid.', 400, false, q.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })));
    const data = await fetchCandles(q.data);
    return Response.json({ data: { provider: data.provider, symbol: data.symbol, candles: data.candles, fetchedAt: data.fetchedAt, stale: data.stale } }, { headers: { 'x-request-id': requestId, 'cache-control': 'private, max-age=5' } });
  } catch (err) {
    return errorResponse(err, requestId);
  }
}
