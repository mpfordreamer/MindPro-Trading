import { describe, expect, it } from 'vitest';
import { evaluateTrade, progress, windowSince, type OpenTrade } from '@/lib/alertEngine';

const long: OpenTrade = { direction: 'LONG', entry: 100, stopLoss: 98, takeProfit: 110 };
const short: OpenTrade = { direction: 'SHORT', entry: 100, stopLoss: 102, takeProfit: 90 };
const w = (last: number, high = last, low = last) => ({ last, high, low });

describe('progress', () => {
  it('bertanda: sama untuk long & short', () => {
    expect(progress(110, 100, 105)).toBe(0.5);
    expect(progress(90, 100, 95)).toBe(0.5);
    expect(progress(98, 100, 99)).toBe(0.5);
    expect(progress(102, 100, 101)).toBe(0.5);
  });
  it('level = entry → 0 (tidak NaN)', () => expect(progress(100, 100, 105)).toBe(0));
});

describe('evaluateTrade LONG', () => {
  it('di tengah → tidak ada alert', () => expect(evaluateTrade(long, w(101)).length).toBe(0));
  it('80% ke TP → tp_near', () => expect(evaluateTrade(long, w(108)).join()).toBe('tp_near'));
  it('tepat 80% termasuk', () => expect(evaluateTrade(long, w(108)).includes('tp_near')).toBe(true));
  it('high menyentuh TP walau harga sudah balik → tp_hit saja', () => expect(evaluateTrade(long, w(103, 110.2, 102)).join()).toBe('tp_hit'));
  it('80% ke SL → sl_near', () => expect(evaluateTrade(long, w(98.4)).join()).toBe('sl_near'));
  it('low menembus SL → sl_hit', () => expect(evaluateTrade(long, w(99, 100, 97.9)).join()).toBe('sl_hit'));
  it('sentuh keduanya dalam jendela → dua hit', () => expect(evaluateTrade(long, w(100, 111, 97)).join()).toBe('tp_hit,sl_hit'));
});

describe('evaluateTrade SHORT', () => {
  it('turun ke 92 → tp_near', () => expect(evaluateTrade(short, w(92)).join()).toBe('tp_near'));
  it('naik ke 101.7 → sl_near', () => expect(evaluateTrade(short, w(101.7)).join()).toBe('sl_near'));
  it('low menyentuh TP → tp_hit; high menyentuh SL → sl_hit', () => {
    expect(evaluateTrade(short, w(95, 96, 89.9)).join()).toBe('tp_hit');
    expect(evaluateTrade(short, w(100, 102.1, 99)).join()).toBe('sl_hit');
  });
});

describe('windowSince', () => {
  const cs = [{ time: 100, high: 120, low: 80, close: 100 }, { time: 200, high: 105, low: 99, close: 104 }, { time: 300, high: 106, low: 103, close: 105 }];
  it('hanya candle setelah trade dicatat (candle lama tidak memicu alert palsu)', () => {
    const r = windowSince(cs, 200)!;
    expect(r.high).toBe(106); expect(r.low).toBe(99); expect(r.last).toBe(105);
  });
  it('belum ada candle baru → hanya harga terakhir', () => {
    const r = windowSince(cs, 999)!;
    expect(r.high).toBe(105); expect(r.low).toBe(105);
  });
  it('kosong → null', () => expect(windowSince([], 0)).toBeNull());
});
