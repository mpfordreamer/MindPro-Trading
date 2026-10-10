import type { AiAnalysis } from './validators';

export const MIN_RR = 1.5;
export const MIN_SL_DISTANCE_PCT = 0.1; // SL lebih dekat dari 0.1% dari entry dianggap rawan tersapu noise

export interface Consensus { bullishPct: number; bearishPct: number; neutralPct: number }

export function computeConsensus(evals: Pick<AiAnalysis['agentEvaluations'][number], 'bias'>[]): Consensus {
  const n = evals.length || 1;
  const bull = Math.round((evals.filter((e) => e.bias === 'BULLISH').length / n) * 100);
  const bear = Math.round((evals.filter((e) => e.bias === 'BEARISH').length / n) * 100);
  return { bullishPct: bull, bearishPct: bear, neutralPct: Math.max(0, 100 - bull - bear) };
}

export interface RiskReward { rr1: number | null; rr2: number | null; slDistancePct: number | null }

/** Entry konservatif: long masuk di batas atas zona, short di batas bawah. */
export function computeRiskReward(t: AiAnalysis['tradeSetup']): RiskReward {
  const none = { rr1: null, rr2: null, slDistancePct: null };
  if (t.bias === 'NEUTRAL' || t.entryLow === null || t.entryHigh === null || t.stopLoss === null || t.takeProfit1 === null) return none;
  const entry = t.bias === 'BULLISH' ? t.entryHigh : t.entryLow;
  const risk = Math.abs(entry - t.stopLoss);
  if (risk === 0) return none;
  const r = (tp: number) => Math.round((Math.abs(tp - entry) / risk) * 100) / 100;
  return { rr1: r(t.takeProfit1), rr2: t.takeProfit2 === null ? null : r(t.takeProfit2), slDistancePct: Math.round((risk / entry) * 10000) / 100 };
}

export function buildWarnings(a: AiAnalysis, c: Consensus, rr: RiskReward, hasImage: boolean): string[] {
  const w: string[] = [];
  if (!hasImage) w.push('Tidak ada gambar chart: level harga tidak dapat diverifikasi dari visual.');
  if (rr.rr1 !== null && rr.rr1 < MIN_RR) w.push(`R:R ke TP1 hanya 1:${rr.rr1} (minimum disarankan 1:${MIN_RR}).`);
  if (rr.slDistancePct !== null && rr.slDistancePct < MIN_SL_DISTANCE_PCT) w.push(`Stop loss sangat dekat (${rr.slDistancePct}% dari entry) — rawan tersapu noise.`);
  const buy = a.overallDecision.includes('BUY');
  const sell = a.overallDecision.includes('SELL');
  if ((buy && c.bearishPct > c.bullishPct) || (sell && c.bullishPct > c.bearishPct))
    w.push('Keputusan akhir bertentangan dengan mayoritas agent. Periksa ringkasan debat.');
  if (a.tradeSetup.insufficientDataReason) w.push(`Data tidak cukup: ${a.tradeSetup.insufficientDataReason}`);
  return w;
}

/** Peringatan top-down; `provided` = timeframe yang gambarnya diunggah. */
export function buildTopDownWarnings(a: AiAnalysis, provided: string[]): string[] {
  if (!provided.length) return [];
  const w: string[] = [];
  const reported = new Set(a.timeframeAnalysis.map((t) => t.timeframe));
  const missing = provided.filter((tf) => !reported.has(tf as never));
  if (missing.length) w.push(`AI tidak melaporkan analisa untuk timeframe: ${missing.join(', ')}.`);
  if (a.topDown.alignment === 'CONFLICTING') w.push('Timeframe saling bertentangan (counter-trend). Risiko lebih tinggi — tunggu konfirmasi.');
  if (a.topDown.alignment === 'NOT_AVAILABLE') w.push('AI tidak dapat menilai keselarasan timeframe meski gambar dilampirkan.');
  return w;
}
