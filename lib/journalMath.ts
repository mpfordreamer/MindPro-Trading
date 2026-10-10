import { MIN_RR, MIN_SL_DISTANCE_PCT } from './tradeMath';

export type Direction = 'LONG' | 'SHORT';
export type Result = 'win' | 'loss' | 'breakeven';
export interface Plan { direction: Direction; entry: number; stopLoss: number; takeProfit: number }

const r2 = (n: number) => Math.round(n * 100) / 100;
export const directionFromBias = (b: string): Direction | null => (b === 'BULLISH' ? 'LONG' : b === 'BEARISH' ? 'SHORT' : null);

const riskOf = (p: Plan) => (p.direction === 'LONG' ? p.entry - p.stopLoss : p.stopLoss - p.entry);
const rewardOf = (p: Plan) => (p.direction === 'LONG' ? p.takeProfit - p.entry : p.entry - p.takeProfit);

export function plannedRR(p: Plan): number | null {
  const risk = riskOf(p), reward = rewardOf(p);
  return risk > 0 && reward > 0 ? r2(reward / risk) : null;
}

export interface PlanCheck { errors: string[]; warnings: string[]; rr: number | null }
/** errors = geometri mustahil (ditolak). warnings = boleh lanjut hanya dengan acknowledgeRisk. */
export function validatePlan(p: Plan): PlanCheck {
  const errors: string[] = [], warnings: string[] = [];
  if (riskOf(p) <= 0) errors.push(p.direction === 'LONG' ? 'LONG: stop loss harus di bawah entry.' : 'SHORT: stop loss harus di atas entry.');
  if (rewardOf(p) <= 0) errors.push(p.direction === 'LONG' ? 'LONG: take profit harus di atas entry.' : 'SHORT: take profit harus di bawah entry.');
  const rr = plannedRR(p);
  if (!errors.length && rr !== null) {
    if (rr < MIN_RR) warnings.push(`R:R rencana 1:${rr} di bawah minimum 1:${MIN_RR}.`);
    const slPct = r2((riskOf(p) / p.entry) * 100);
    if (slPct < MIN_SL_DISTANCE_PCT) warnings.push(`Stop loss hanya ${slPct}% dari entry — rawan tersapu noise.`);
  }
  return { errors, warnings, rr };
}

/** R aktual bila exitPrice ada; jika tidak: win = R:R rencana (TP tercapai), loss = -1, breakeven = 0. */
export function computeRMultiple(p: Plan, result: Result, exitPrice?: number): number {
  if (exitPrice !== undefined) {
    const risk = riskOf(p);
    return risk > 0 ? r2((p.direction === 'LONG' ? exitPrice - p.entry : p.entry - exitPrice) / risk) : 0;
  }
  if (result === 'win') return plannedRR(p) ?? 0;
  return result === 'loss' ? -1 : 0;
}

export const BREAKEVEN_TOLERANCE_R = 0.15;
/** Mencegah label tidak konsisten dengan harga exit (mis. "Win" tapi exit di bawah entry untuk long). */
export function outcomeConsistencyError(result: Result, r: number): string | null {
  if (result === 'win' && r <= 0) return 'Hasil "Win" tidak cocok dengan harga exit (R ≤ 0).';
  if (result === 'loss' && r >= 0) return 'Hasil "Loss" tidak cocok dengan harga exit (R ≥ 0).';
  if (result === 'breakeven' && Math.abs(r) > BREAKEVEN_TOLERANCE_R) return `Breakeven hanya untuk |R| ≤ ${BREAKEVEN_TOLERANCE_R}; harga exit memberi R ${r}.`;
  return null;
}

export interface ClosedTrade { result: Result; rMultiple: number; plannedRR: number | null }
export interface JournalStats {
  totalAnalyses: number; totalTrades: number; openTrades: number; closedTrades: number;
  wins: number; losses: number; breakeven: number;
  /** wins / (wins + losses) dalam %, breakeven tidak dihitung. */
  winRate: number | null;
  avgR: number | null; avgPlannedRR: number | null;
  /** gross profit R / gross loss R; null bila belum ada loss (tidak terdefinisi). */
  profitFactor: number | null;
  grossProfitR: number; grossLossR: number; bestR: number | null; worstR: number | null;
}

export function computeStats(closed: ClosedTrade[], totals: { analyses: number; trades: number }): JournalStats {
  const wins = closed.filter((t) => t.result === 'win').length;
  const losses = closed.filter((t) => t.result === 'loss').length;
  const rs = closed.map((t) => t.rMultiple);
  const gp = r2(rs.filter((r) => r > 0).reduce((a, b) => a + b, 0));
  const gl = r2(Math.abs(rs.filter((r) => r < 0).reduce((a, b) => a + b, 0)));
  const planned = closed.map((t) => t.plannedRR).filter((v): v is number => v !== null);
  const avg = (a: number[]) => (a.length ? r2(a.reduce((x, y) => x + y, 0) / a.length) : null);
  return {
    totalAnalyses: totals.analyses, totalTrades: totals.trades, openTrades: Math.max(0, totals.trades - closed.length), closedTrades: closed.length,
    wins, losses, breakeven: closed.length - wins - losses,
    winRate: wins + losses ? Math.round((wins / (wins + losses)) * 1000) / 10 : null,
    avgR: avg(rs), avgPlannedRR: avg(planned),
    profitFactor: gl > 0 ? r2(gp / gl) : null,
    grossProfitR: gp, grossLossR: gl, bestR: rs.length ? Math.max(...rs) : null, worstR: rs.length ? Math.min(...rs) : null,
  };
}
