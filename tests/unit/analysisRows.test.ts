import { describe, expect, it } from 'vitest';
import { buildAnalysisRow, buildDebateRow, buildEvaluationRows } from '@/lib/analysisRows';

const ai = {
  overallDecision: 'BUY', confidenceScore: 72,
  tradeSetup: { bias: 'BULLISH', entryLow: 100, entryHigh: 102, stopLoss: 98, takeProfit1: 110, takeProfit2: null, keyLevels: [], insufficientDataReason: null },
  debate: { summary: 'ringkas', clashes: [{ agentA: 'a', agentB: 'b' }] },
  agentEvaluations: [
    { id: 'a', bias: 'BULLISH', conviction: 80, argument: 'x', evidence: ['e'], highlightedKey: 'k' },
    { id: 'b', bias: 'BEARISH', conviction: 40, argument: 'y', evidence: [], highlightedKey: 'k2' },
  ],
} as never;

describe('analysis rows', () => {
  const src = { userId: 'u', requestId: 'r', asset: 'BTC/USDT', timeframe: '4H', marketType: 'Crypto', ai, consensus: { bullishPct: 50 }, rr1: 2, livePrice: 101, setupReliable: true, warnings: ['w'], chartPaths: ['u/x.jpg'], model: 'm', promptVersion: 'v2', result: { any: 1 } };
  it('memetakan kolom yang di-query (angka, bukan hanya jsonb)', () => {
    const row = buildAnalysisRow(src as never);
    expect(row.decision).toBe('BUY');
    expect(row.bias).toBe('BULLISH');
    expect(row.entry_high).toBe(102);
    expect(row.take_profit_2).toBeNull();
    expect(row.rr1).toBe(2);
    expect(row.chart_paths.join()).toBe('u/x.jpg');
    expect(row.prompt_version).toBe('v2');
  });
  it('satu baris evaluasi per agent, terhubung ke analisa & user', () => {
    const rows = buildEvaluationRows('AID', 'u', ai);
    expect(rows.length).toBe(2);
    expect(rows[0].analysis_id).toBe('AID');
    expect(rows[1].agent_id).toBe('b');
    expect(rows[1].user_id).toBe('u');
  });
  it('baris debat', () => {
    const d = buildDebateRow('AID', 'u', ai);
    expect(d.summary).toBe('ringkas');
    expect(d.analysis_id).toBe('AID');
  });
});
