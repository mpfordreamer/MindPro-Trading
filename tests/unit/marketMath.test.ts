import { describe, expect, it } from 'vitest';
import { atr, parseBinanceKlines, parseTwelveSeries, providerFor, summarize, toBinanceSymbol, toTwelveSymbol, type Candle } from '@/lib/marketMath';

const candle = (i: number, o: number, h: number, l: number, c: number): Candle => ({ time: 1000 + i, open: o, high: h, low: l, close: c, volume: 1 });

describe('symbol mapping', () => {
  it('Binance', () => {
    expect(toBinanceSymbol('BTC/USDT')).toBe('BTCUSDT');
    expect(toBinanceSymbol('eth-usd')).toBe('ETHUSDT');
  });
  it('TwelveData', () => {
    expect(toTwelveSymbol('XAUUSD')).toBe('XAU/USD');
    expect(toTwelveSymbol('EUR/USD')).toBe('EUR/USD');
    expect(toTwelveSymbol('AAPL')).toBe('AAPL');
  });
  it('provider', () => {
    expect(providerFor('Crypto')).toBe('binance');
    expect(providerFor('Forex')).toBe('twelvedata');
  });
});

describe('parsers', () => {
  it('Binance klines', () => {
    const c = parseBinanceKlines([[1700000000000, '100', '110', '95', '105', '12.5', 0]]);
    expect(c[0].time).toBe(1700000000);
    expect(c[0].high).toBe(110);
  });
  it('Binance menolak format salah', () => {
    expect(() => parseBinanceKlines({ code: -1121 })).toThrow();
    expect(() => parseBinanceKlines([[1, 'abc', 1, 1, 1, 1]])).toThrow();
  });
  it('TwelveData terurut naik dan menangani tanggal harian', () => {
    const c = parseTwelveSeries({ values: [{ datetime: '2026-10-08', open: '2', high: '3', low: '1', close: '2.5' }, { datetime: '2026-10-07', open: '1', high: '2', low: '1', close: '2' }] });
    expect(c[0].close).toBe(2);
    expect(c[1].time > c[0].time).toBe(true);
    expect(c[1].volume).toBe(0);
  });
  it('TwelveData error dilempar', () => {
    expect(() => parseTwelveSeries({ status: 'error', message: 'limit' })).toThrow();
  });
});

describe('atr & summarize', () => {
  it('null bila candle kurang', () => expect(atr([candle(0, 1, 2, 1, 2)])).toBeNull());
  it('ATR candle seragam = range', () => {
    const cs = Array.from({ length: 20 }, (_, i) => candle(i, 100, 105, 95, 100)); // TR selalu 10
    expect(atr(cs)).toBe(10);
  });
  it('summarize memakai close terakhir sebagai harga live', () => {
    const cs = Array.from({ length: 20 }, (_, i) => candle(i, 100, 105 + i, 95, 100 + i));
    const s = summarize(cs)!;
    expect(s.livePrice).toBe(119);
    expect(s.rangeHigh).toBe(124);
    expect(s.rangeLow).toBe(95);
  });
  it('summarize kosong', () => expect(summarize([])).toBeNull());
});

import { CACHE_CANDLES, FRESH_TTL_MS, STALE_MAX_MS } from '@/lib/marketMath';
describe('cache constants', () => {
  it('TwelveData (berkuota) di-cache lebih lama dari Binance', () => expect(FRESH_TTL_MS.twelvedata > FRESH_TTL_MS.binance).toBe(true));
  it('polling 30 dtk ≥ TTL Binance; stale window > TTL', () => {
    expect(30_000 >= FRESH_TTL_MS.binance).toBe(true);
    expect(STALE_MAX_MS > FRESH_TTL_MS.twelvedata).toBe(true);
    expect(CACHE_CANDLES >= 300).toBe(true);
  });
});
