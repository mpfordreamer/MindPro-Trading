// Pemetaan hasil analisa → baris tabel (murni, teruji). Dipakai lib/persist.ts.
import type { AiAnalysis } from './validators';

export interface AnalysisSource {
  userId: string; requestId: string; asset: string; timeframe: string; marketType: string;
  ai: AiAnalysis; consensus: unknown; rr1: number | null; livePrice: number | null; setupReliable: boolean;
  warnings: string[]; chartPaths: string[]; model: string; promptVersion: string;
  /** Payload lengkap yang dikirim ke klien (disimpan agar analisa bisa dibuka ulang persis sama). */
  result: unknown;
}

export function buildAnalysisRow(s: AnalysisSource) {
  const t = s.ai.tradeSetup;
  return {
    user_id: s.userId, asset: s.asset, timeframe: s.timeframe, market_type: s.marketType,
    decision: s.ai.overallDecision, confidence: s.ai.confidenceScore, bias: t.bias,
    entry_low: t.entryLow, entry_high: t.entryHigh, stop_loss: t.stopLoss, take_profit_1: t.takeProfit1, take_profit_2: t.takeProfit2,
    rr1: s.rr1, live_price: s.livePrice, setup_reliable: s.setupReliable,
    consensus: s.consensus, warnings: s.warnings, result: s.result, chart_paths: s.chartPaths,
    prompt_version: s.promptVersion, model: s.model, request_id: s.requestId,
  };
}

export function buildEvaluationRows(analysisId: string, userId: string, ai: AiAnalysis) {
  return ai.agentEvaluations.map((e) => ({
    analysis_id: analysisId, user_id: userId, agent_id: e.id, bias: e.bias, conviction: e.conviction,
    argument: e.argument, evidence: e.evidence, highlighted_key: e.highlightedKey,
  }));
}

export const buildDebateRow = (analysisId: string, userId: string, ai: AiAnalysis) => ({
  analysis_id: analysisId, user_id: userId, summary: ai.debate.summary, clashes: ai.debate.clashes,
});
