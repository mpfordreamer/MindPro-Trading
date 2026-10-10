import { apiRoute, z } from '@/lib/api';
import { must, parseQuery } from '@/lib/http';

export const runtime = 'nodejs';

const Q = z.object({
  saved: z.enum(['true', 'false']).default('true'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
});

export const GET = apiRoute(async ({ req, sb }) => {
  const q = parseQuery(req, Q);
  let query = sb.from('analyses')
    .select('id,asset,timeframe,market_type,decision,confidence,bias,rr1,setup_reliable,saved,created_at')
    .eq('saved', q.saved === 'true').order('created_at', { ascending: false }).limit(q.limit);
  if (q.before) query = query.lt('created_at', q.before);
  const rows = must(await query, 'analyses.list');
  return { data: { items: rows, nextBefore: rows.length === q.limit ? rows[rows.length - 1].created_at : null } };
});
