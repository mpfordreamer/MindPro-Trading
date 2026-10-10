import { describe, expect, it } from 'vitest';
import { AGENT_IDS } from '@/lib/agents';
import { AnalyzeRequestSchema, TradeSetupSchema, AiAnalysisSchema } from '@/lib/validators';

const UID = '11111111-1111-4111-8111-111111111111';
const FID = '22222222-2222-4222-8222-222222222222';

describe('AnalyzeRequestSchema', () => {
  const ok = { asset: 'BTC/USDT', timeframe: '4H', marketType: 'Crypto' };
  it('menerima input valid tanpa gambar', () => expect(AnalyzeRequestSchema.safeParse(ok).success).toBe(true));
  it('menolak timeframe tak dikenal', () => expect(AnalyzeRequestSchema.safeParse({ ...ok, timeframe: '7M' }).success).toBe(false));
  it('menolak karakter berbahaya pada aset', () => expect(AnalyzeRequestSchema.safeParse({ ...ok, asset: 'BTC<script>' }).success).toBe(false));
  it('menerima 3 chart dengan timeframe berbeda', () => {
    const charts = ['1D', '4H', '15M'].map((timeframe) => ({ timeframe, path: `${UID}/${FID}.jpg` }));
    expect(AnalyzeRequestSchema.safeParse({ ...ok, charts }).success).toBe(true);
  });
  it('menolak lebih dari 3 chart', () => {
    const charts = ['1W', '1D', '4H', '15M'].map((timeframe) => ({ timeframe, path: `${UID}/${FID}.jpg` }));
    expect(AnalyzeRequestSchema.safeParse({ ...ok, charts }).success).toBe(false);
  });
  it('menolak timeframe chart duplikat', () => {
    const charts = [{ timeframe: '4H', path: `${UID}/${FID}.jpg` }, { timeframe: '4H', path: `${UID}/${FID}.png` }];
    expect(AnalyzeRequestSchema.safeParse({ ...ok, charts }).success).toBe(false);
  });
  it('menolak path traversal', () => {
    expect(AnalyzeRequestSchema.safeParse({ ...ok, charts: [{ timeframe: '4H', path: `../../etc/passwd` }] }).success).toBe(false);
  });
});

describe('TradeSetupSchema', () => {
  const t = { bias: 'BULLISH', entryLow: 100, entryHigh: 102, stopLoss: 98, takeProfit1: 110, takeProfit2: null, keyLevels: [], insufficientDataReason: null };
  it('lolos untuk long konsisten', () => expect(TradeSetupSchema.safeParse(t).success).toBe(true));
  it('menolak long dengan SL di atas entry', () => expect(TradeSetupSchema.safeParse({ ...t, stopLoss: 105 }).success).toBe(false));
  it('menolak short dengan TP di atas entry', () => expect(TradeSetupSchema.safeParse({ ...t, bias: 'BEARISH', stopLoss: 105, takeProfit1: 120 }).success).toBe(false));
  it('mengizinkan semua null (tidak cukup data)', () =>
    expect(TradeSetupSchema.safeParse({ ...t, bias: 'NEUTRAL', entryLow: null, entryHigh: null, stopLoss: null, takeProfit1: null, insufficientDataReason: 'tidak cukup data' }).success).toBe(true));
});

describe('AiAnalysisSchema', () => {
  const agent = (id: string) => ({ id, bias: 'BULLISH', conviction: 70, argument: 'Argumen spesifik yang cukup panjang.', evidence: [], highlightedKey: 'Key' });
  const base = () => ({
    overallDecision: 'BUY', confidenceScore: 70,
    tradeSetup: { bias: 'NEUTRAL', entryLow: null, entryHigh: null, stopLoss: null, takeProfit1: null, takeProfit2: null, keyLevels: [], insufficientDataReason: 'tidak cukup data' },
    technicalAnalysis: { summary: 's', patternsDetected: [], indicatorStatus: 'i', marketStructure: 'm' },
    fundamentalAnalysis: { summary: 's', macroDrivers: [], riskFactors: [], sentimentRating: 'x' },
    debate: { summary: 's', clashes: [0, 1].map(() => ({ agentA: AGENT_IDS[0], agentB: AGENT_IDS[1], topic: 't', argumentA: 'a', rebuttalB: 'b', resolution: 'r' })) },
    dataQualityNotes: [], chartReadings: [], timeframeAnalysis: [], topDown: { alignment: 'NOT_AVAILABLE', primaryTrend: 'p', entryTrigger: 'e' },
    agentEvaluations: AGENT_IDS.map(agent),
  });
  it('lolos dengan 25 agent unik', () => expect(AiAnalysisSchema.safeParse(base()).success).toBe(true));
  it('menerima analisa multi-timeframe', () => {
    const b = { ...base(), topDown: { alignment: 'ALIGNED', primaryTrend: 'p', entryTrigger: 'e' },
      chartReadings: [{ timeframe: '4H', visibleLow: 90, visibleHigh: 110, lastVisiblePrice: 100 }],
      timeframeAnalysis: [{ timeframe: '4H', trend: 'BULLISH', summary: 's', zones: [{ type: 'FVG', low: 98, high: 100, note: 'n' }] }] };
    expect(AiAnalysisSchema.safeParse(b).success).toBe(true);
  });
  it('menolak zona dengan low > high', () => {
    const b = { ...base(), timeframeAnalysis: [{ timeframe: '4H', trend: 'BULLISH', summary: 's', zones: [{ type: 'FVG', low: 105, high: 100, note: 'n' }] }] };
    expect(AiAnalysisSchema.safeParse(b).success).toBe(false);
  });
  it('gagal bila kurang dari 25 agent', () => {
    const b = base(); b.agentEvaluations = b.agentEvaluations.slice(0, 24);
    expect(AiAnalysisSchema.safeParse(b).success).toBe(false);
  });
  it('gagal bila ada agent duplikat', () => {
    const b = base(); b.agentEvaluations[1] = agent(AGENT_IDS[0]);
    expect(AiAnalysisSchema.safeParse(b).success).toBe(false);
  });
  it('gagal bila id agent tidak dikenal', () => {
    const b = base(); b.agentEvaluations[0] = agent('agent_palsu');
    expect(AiAnalysisSchema.safeParse(b).success).toBe(false);
  });
});

import { JournalCreateSchema, OutcomeSchema } from '@/lib/validators';
describe('Fase 3 schemas', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  it('JournalCreate: hanya analysisId sudah cukup (default dari analisa)', () => {
    const r = JournalCreateSchema.safeParse({ analysisId: id });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.acknowledgeRisk).toBe(false);
  });
  it('JournalCreate menolak harga negatif / id bukan uuid', () => {
    expect(JournalCreateSchema.safeParse({ analysisId: id, stopLoss: -1 }).success).toBe(false);
    expect(JournalCreateSchema.safeParse({ analysisId: 'abc' }).success).toBe(false);
  });
  it('Outcome menolak hasil tak dikenal', () => {
    expect(OutcomeSchema.safeParse({ result: 'win' }).success).toBe(true);
    expect(OutcomeSchema.safeParse({ result: 'profit' }).success).toBe(false);
  });
});
