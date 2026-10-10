import { AGENTS, type AgentProfile } from './agents';
import type { Direction, Result } from './journalMath';

export type Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type Verdict = 'correct' | 'wrong' | 'abstain';
export const MIN_SAMPLE = 5;

/**
 * Win → pasar bergerak searah trade; Loss → berlawanan. Agent benar jika biasnya searah dengan arah pasar itu.
 * Breakeven (tidak konklusif) dan bias NEUTRAL tidak dihitung (abstain).
 * Catatan: ini proxy — hasil trade dengan SL/TP tertentu tidak identik dengan "arah pasar".
 */
export function judgeAgent(bias: Bias, direction: Direction, result: Result): Verdict {
  if (result === 'breakeven' || bias === 'NEUTRAL') return 'abstain';
  const agentDir: Direction = bias === 'BULLISH' ? 'LONG' : 'SHORT';
  const opposite: Direction = direction === 'LONG' ? 'SHORT' : 'LONG';
  return agentDir === (result === 'win' ? direction : opposite) ? 'correct' : 'wrong';
}

/** Batas bawah interval Wilson 95% (0..1). Mencegah 1/1 = 100% mengalahkan 80/100. */
export function wilsonLowerBound(correct: number, n: number, z = 1.96): number | null {
  if (n === 0) return null;
  const p = correct / n, z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
}

export interface OutcomeRow { direction: Direction; result: Result; evaluations: { agentId: string; bias: Bias }[] }
export interface AgentScore {
  agentId: string; name: string; category: string; avatar: string;
  correct: number; wrong: number; abstain: number; evaluated: number;
  accuracy: number | null; wilsonLower: number | null; lowSample: boolean; rank: number | null;
}

export function buildLeaderboard(rows: OutcomeRow[], agents: readonly AgentProfile[] = AGENTS): AgentScore[] {
  const acc = new Map(agents.map((a) => [a.id, { correct: 0, wrong: 0, abstain: 0 }]));
  for (const row of rows)
    for (const ev of row.evaluations) {
      const s = acc.get(ev.agentId);
      if (s) s[judgeAgent(ev.bias, row.direction, row.result)]++;
    }
  const scores: AgentScore[] = agents.map((a) => {
    const s = acc.get(a.id)!, n = s.correct + s.wrong, w = wilsonLowerBound(s.correct, n);
    return {
      agentId: a.id, name: a.name, category: a.category, avatar: a.avatar, ...s, evaluated: n,
      accuracy: n ? Math.round((s.correct / n) * 1000) / 10 : null,
      wilsonLower: w === null ? null : Math.round(w * 1000) / 10,
      lowSample: n < MIN_SAMPLE, rank: null,
    };
  });
  scores.sort((a, b) => (b.wilsonLower ?? -1) - (a.wilsonLower ?? -1) || b.evaluated - a.evaluated || a.name.localeCompare(b.name));
  let r = 0;
  for (const s of scores) if (s.evaluated > 0) s.rank = ++r;
  return scores;
}
