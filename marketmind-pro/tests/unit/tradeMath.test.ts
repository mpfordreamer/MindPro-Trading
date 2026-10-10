import { describe, expect, it } from 'vitest';
import { computeConsensus, computeRiskReward, buildWarnings, buildTopDownWarnings } from '@/lib/tradeMath';
import type { AiAnalysis } from '@/lib/validators';

const setup = (o: Partial<AiAnalysis['tradeSetup']> = {}): AiAnalysis['tradeSetup'] => ({
  bias: 'BULLISH', entryLow: 100, entryHigh: 102, stopLoss: 98, takeProfit1: 110, takeProfit2: 118, keyLevels: [], insufficientDataReason: null, ...o,
});

describe('computeConsensus', () => {
  it('menjumlah 100%', () => {
    const c = computeConsensus([{ bias: 'BULLISH' }, { bias: 'BULLISH' }, { bias: 'BEARISH' }]);
    expect(c.bullishPct + c.bearishPct + c.neutralPct).toBe(100);
    expect(c.bullishPct).toBe(67);
  });
});

describe('computeRiskReward', () => {
  it('long memakai entryHigh (konservatif)', () => {
    const r = computeRiskReward(setup());
    expect(r.rr1).toBe(2); // risk 4, reward 8
    expect(r.rr2).toBe(4);
  });
  it('short memakai entryLow', () => {
    const r = computeRiskReward(setup({ bias: 'BEARISH', entryLow: 100, entryHigh: 102, stopLoss: 104, takeProfit1: 92, takeProfit2: null }));
    expect(r.rr1).toBe(2);
    expect(r.rr2).toBeNull();
  });
  it('null bila data tidak cukup', () => {
    expect(computeRiskReward(setup({ stopLoss: null })).rr1).toBeNull();
    expect(computeRiskReward(setup({ bias: 'NEUTRAL' })).rr1).toBeNull();
  });
});

describe('buildWarnings', () => {
  const base = { overallDecision: 'BUY', tradeSetup: setup() } as AiAnalysis;
  it('memperingatkan R:R rendah', () => {
    const w = buildWarnings(base, { bullishPct: 60, bearishPct: 30, neutralPct: 10 }, { rr1: 1.2, rr2: null, slDistancePct: 2 }, true);
    expect(w.some((x) => x.includes('R:R'))).toBe(true);
  });
  it('memperingatkan keputusan vs mayoritas', () => {
    const w = buildWarnings(base, { bullishPct: 20, bearishPct: 70, neutralPct: 10 }, { rr1: 2, rr2: null, slDistancePct: 2 }, true);
    expect(w.some((x) => x.includes('bertentangan'))).toBe(true);
  });
  it('memperingatkan tanpa gambar', () => {
    expect(buildWarnings(base, { bullishPct: 60, bearishPct: 30, neutralPct: 10 }, { rr1: 2, rr2: null, slDistancePct: 2 }, false)[0]).toContain('Tidak ada gambar');
  });
});

describe('buildTopDownWarnings', () => {
  const mk = (alignment: string, tfs: string[]) => ({ topDown: { alignment }, timeframeAnalysis: tfs.map((timeframe) => ({ timeframe })) }) as unknown as AiAnalysis;
  it('kosong tanpa gambar', () => expect(buildTopDownWarnings(mk('NOT_AVAILABLE', []), []).length).toBe(0));
  it('mendeteksi timeframe yang tidak dilaporkan', () => expect(buildTopDownWarnings(mk('ALIGNED', ['1D']), ['1D', '4H'])[0]).toContain('4H'));
  it('memperingatkan CONFLICTING', () => expect(buildTopDownWarnings(mk('CONFLICTING', ['1D']), ['1D'])[0]).toContain('bertentangan'));
});
