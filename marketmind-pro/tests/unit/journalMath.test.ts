import { describe, expect, it } from 'vitest';
import { computeRMultiple, computeStats, directionFromBias, outcomeConsistencyError, plannedRR, validatePlan, type Plan } from '@/lib/journalMath';

const long: Plan = { direction: 'LONG', entry: 100, stopLoss: 98, takeProfit: 106 };
const short: Plan = { direction: 'SHORT', entry: 100, stopLoss: 102, takeProfit: 94 };

describe('plannedRR / validatePlan', () => {
  it('menghitung R:R long & short', () => { expect(plannedRR(long)).toBe(3); expect(plannedRR(short)).toBe(3); });
  it('menolak geometri mustahil', () => {
    expect(validatePlan({ ...long, stopLoss: 101 }).errors.length).toBe(1);
    expect(validatePlan({ ...short, takeProfit: 105 }).errors.length).toBe(1);
    expect(validatePlan({ ...long, stopLoss: 101, takeProfit: 99 }).errors.length).toBe(2);
  });
  it('rencana sehat tanpa error/peringatan', () => {
    const c = validatePlan(long);
    expect(c.errors.length + c.warnings.length).toBe(0);
  });
  it('R:R < 1.5 → peringatan', () => expect(validatePlan({ ...long, takeProfit: 102 }).warnings[0]).toContain('R:R'));
  it('SL terlalu dekat → peringatan', () => expect(validatePlan({ direction: 'LONG', entry: 100, stopLoss: 99.95, takeProfit: 101 }).warnings.length > 0).toBe(true));
  it('arah dari bias', () => { expect(directionFromBias('BULLISH')).toBe('LONG'); expect(directionFromBias('NEUTRAL')).toBeNull(); });
});

describe('computeRMultiple', () => {
  it('tanpa exit: win=R:R rencana, loss=-1, BE=0', () => {
    expect(computeRMultiple(long, 'win')).toBe(3);
    expect(computeRMultiple(long, 'loss')).toBe(-1);
    expect(computeRMultiple(long, 'breakeven')).toBe(0);
  });
  it('dengan exit: long & short', () => {
    expect(computeRMultiple(long, 'win', 104)).toBe(2);
    expect(computeRMultiple(long, 'loss', 99)).toBe(-0.5);
    expect(computeRMultiple(short, 'win', 97)).toBe(1.5);
  });
});

describe('outcomeConsistencyError', () => {
  it('menolak label yang bertentangan dengan R', () => {
    expect(outcomeConsistencyError('win', -0.5)).toContain('Win');
    expect(outcomeConsistencyError('loss', 1)).toContain('Loss');
    expect(outcomeConsistencyError('breakeven', 0.5)).toContain('Breakeven');
  });
  it('menerima yang konsisten', () => {
    expect(outcomeConsistencyError('win', 2)).toBeNull();
    expect(outcomeConsistencyError('loss', -1)).toBeNull();
    expect(outcomeConsistencyError('breakeven', 0.1)).toBeNull();
  });
});

describe('computeStats', () => {
  const closed = [
    { result: 'win' as const, rMultiple: 3, plannedRR: 3 },
    { result: 'win' as const, rMultiple: 2, plannedRR: 2 },
    { result: 'loss' as const, rMultiple: -1, plannedRR: 2 },
    { result: 'breakeven' as const, rMultiple: 0, plannedRR: 1.5 },
  ];
  it('menghitung metrik utama', () => {
    const s = computeStats(closed, { analyses: 10, trades: 6 });
    expect(s.winRate).toBe(66.7); // 2/(2+1), BE tidak dihitung
    expect(s.profitFactor).toBe(5);
    expect(s.avgR).toBe(1);
    expect(s.avgPlannedRR).toBe(2.13);
    expect(s.openTrades).toBe(2);
    expect(s.bestR).toBe(3);
    expect(s.worstR).toBe(-1);
  });
  it('kosong → null, bukan NaN', () => {
    const s = computeStats([], { analyses: 0, trades: 0 });
    expect(s.winRate).toBeNull(); expect(s.avgR).toBeNull(); expect(s.profitFactor).toBeNull();
  });
  it('tanpa loss → profit factor null (tidak terdefinisi)', () => {
    expect(computeStats([closed[0]], { analyses: 1, trades: 1 }).profitFactor).toBeNull();
  });
});
