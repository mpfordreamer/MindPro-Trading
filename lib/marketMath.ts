// Fungsi murni (tanpa network/env) agar mudah diuji.
import type { Timeframe } from './validators';

export interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number }
export type Provider = 'binance' | 'twelvedata';

export const providerFor = (marketType: string): Provider => (marketType === 'Crypto' ? 'binance' : 'twelvedata');
export const BINANCE_INTERVAL: Record<Timeframe, string> = { '15M': '15m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w' };
export const TWELVE_INTERVAL: Record<Timeframe, string> = { '15M': '15min', '1H': '1h', '4H': '4h', '1D': '1day', '1W': '1week' };

export function toBinanceSymbol(asset: string): string {
  const s = asset.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.endsWith('USD') ? `${s}T` : s; // BTCUSD → BTCUSDT
}

export function toTwelveSymbol(asset: string): string {
  const a = asset.toUpperCase().trim();
  if (a.includes('/')) return a;
  return /^[A-Z]{6}$/.test(a) ? `${a.slice(0, 3)}/${a.slice(3)}` : a; // XAUUSD → XAU/USD, AAPL tetap
}

const num = (v: unknown) => { const n = Number(v); if (!Number.isFinite(n)) throw new Error('angka tidak valid'); return n; };

export function parseBinanceKlines(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) throw new Error('format klines tidak valid');
  return raw.map((k) => {
    if (!Array.isArray(k) || k.length < 6) throw new Error('baris klines tidak valid');
    return { time: Math.floor(num(k[0]) / 1000), open: num(k[1]), high: num(k[2]), low: num(k[3]), close: num(k[4]), volume: num(k[5]) };
  });
}

export function parseTwelveSeries(raw: unknown): Candle[] {
  const r = raw as { status?: string; message?: string; values?: Record<string, string>[] };
  if (r?.status === 'error') throw new Error(r.message ?? 'TwelveData error');
  if (!Array.isArray(r?.values)) throw new Error('format time_series tidak valid');
  return r.values
    .map((v) => {
      const dt = v.datetime.length === 10 ? `${v.datetime}T00:00:00Z` : `${v.datetime.replace(' ', 'T')}Z`;
      return { time: Math.floor(Date.parse(dt) / 1000), open: num(v.open), high: num(v.high), low: num(v.low), close: num(v.close), volume: v.volume ? num(v.volume) : 0 };
    })
    .sort((a, b) => a.time - b.time);
}

export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs = candles.slice(-(period + 1)).map((c, i, arr) => {
    if (i === 0) return 0;
    const pc = arr[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });
  return trs.slice(1).reduce((a, b) => a + b, 0) / period;
}

export interface MarketSummary { livePrice: number; atr14: number | null; rangeHigh: number; rangeLow: number; candleCount: number; lastCandleTime: number }

/** livePrice = close candle berjalan (terakhir) — sudah harga terkini, tidak perlu panggilan ticker terpisah. */
export function summarize(candles: Candle[]): MarketSummary | null {
  if (!candles.length) return null;
  const recent = candles.slice(-100);
  const last = candles[candles.length - 1];
  return {
    livePrice: last.close,
    atr14: atr(candles),
    rangeHigh: Math.max(...recent.map((c) => c.high)),
    rangeLow: Math.min(...recent.map((c) => c.low)),
    candleCount: candles.length,
    lastCandleTime: last.time,
  };
}

/** TTL segar per provider. Binance gratis & longgar → 10 dtk; TwelveData berkuota (8/mnt, 800/hari) → 30 dtk. */
export const FRESH_TTL_MS: Record<Provider, number> = { binance: 10_000, twelvedata: 30_000 };
export const STALE_MAX_MS = 5 * 60_000; // saat provider error, data ≤5 menit masih boleh ditampilkan (ditandai stale)
export const CACHE_CANDLES = 300; // selalu simpan 300 candle per (provider, simbol, timeframe); permintaan lain = slice
