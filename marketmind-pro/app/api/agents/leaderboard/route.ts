import { apiRoute, z } from '@/lib/api';
import { buildLeaderboard } from '@/lib/agentScore';
import { AppError } from '@/lib/errors';
import { must } from '@/lib/http';

export const runtime = 'nodejs';

const Bias = z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']);
const Row = z.object({
  direction: z.enum(['LONG', 'SHORT']),
  result: z.enum(['win', 'loss', 'breakeven']),
  analysis: z.preprocess((v) => (Array.isArray(v) ? v[0] : v), z.object({ agent_evaluations: z.array(z.object({ agent_id: z.string(), bias: Bias })) }).nullable()),
});

/** Skor per-user (riwayat trade Anda sendiri). 500 hasil terbaru. */
export const GET = apiRoute(async ({ sb }) => {
  const raw = must(await sb.from('trade_outcomes').select('direction,result,analysis:analyses(agent_evaluations(agent_id,bias))').order('closed_at', { ascending: false }).limit(500), 'leaderboard');
  const parsed = z.array(Row).safeParse(raw);
  if (!parsed.success) { console.error('leaderboard rows', parsed.error.issues.slice(0, 3)); throw new AppError('INTERNAL', 'Data leaderboard tidak terbaca.', 500, true); }
  const rows = parsed.data.map((r) => ({ direction: r.direction, result: r.result, evaluations: (r.analysis?.agent_evaluations ?? []).map((e) => ({ agentId: e.agent_id, bias: e.bias })) }));
  return { data: { agents: buildLeaderboard(rows), outcomesCount: rows.length, scoredCount: rows.filter((r) => r.result !== 'breakeven').length } };
});
