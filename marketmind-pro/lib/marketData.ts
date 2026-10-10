import 'server-only';
import { createCache, memoryStore, type Entry } from './cache';
import { env } from './env';
import { getRedis } from './redis';
import { AppError } from './errors';
import {
  BINANCE_INTERVAL, CACHE_CANDLES, FRESH_TTL_MS, STALE_MAX_MS, TWELVE_INTERVAL, parseBinanceKlines, parseTwelveSeries, providerFor, summarize, toBinanceSymbol, toTwelveSymbol,
  type Candle, type MarketSummary, type Provider,
} from './marketMath';
import type { AnalyzeRequest, Timeframe } from './validators';

export interface CandleResult { provider: Provider; symbol: string; candles: Candle[]; fetchedAt: number; stale: boolean }
export interface MarketContext { provider: Provider; symbol: string; timeframe: Timeframe; summary: MarketSummary; fetchedAt: string; stale: boolean }

const unavailable = (msg: string, retryable = true) => new AppError('MARKET_DATA_UNAVAILABLE', msg, 502, retryable);

async function getJson(url: string, headers: Record<string, string> = {}) {
  let res: Response;
  try { res = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(6000) }); }
  catch { throw unavailable('Penyedia data harga tidak merespons.'); }
  if (res.status === 400) throw unavailable('Simbol tidak ditemukan di penyedia data.', false);
  if (res.status === 429) throw unavailable('Kuota penyedia data harga habis. Coba sesaat lagi.');
  if (!res.ok) throw unavailable(`Penyedia data harga error (${res.status}).`);
  return res.json();
}

// Redis (Upstash) bila tersedia → dibagi ke semua instance & user; kalau tidak, memori per-instance.
let cache: ReturnType<typeof createCache> | null = null;
const getCache = () => {
  if (cache) return cache;
  const r = getRedis();
  return (cache = createCache(r
    ? { get: async <T>(k: string) => (await r.get<Entry<T>>(k)) ?? null, set: async <T>(k: string, e: Entry<T>, ttl: number) => { await r.set(k, e, { px: ttl }); } }
    : memoryStore()));
};

interface Raw { provider: Provider; symbol: string; candles: Candle[] }

/** Entry point publik: semua pemanggil (chart polling, /api/analyze) lewat cache ini. */
export async function fetchCandles(p: { asset: string; marketType: string; timeframe: Timeframe; limit: number }): Promise<CandleResult> {
  const provider = providerFor(p.marketType);
  const symbol = provider === 'binance' ? toBinanceSymbol(p.asset) : toTwelveSymbol(p.asset);
  const key = `mm:candles:${provider}:${symbol}:${p.timeframe}`;
  const r = await getCache().getOrFetch<Raw>(key, FRESH_TTL_MS[provider], STALE_MAX_MS, () =>
    fetchFromProvider({ asset: p.asset, marketType: p.marketType, timeframe: p.timeframe, limit: CACHE_CANDLES }));
  return { provider, symbol, candles: r.value.candles.slice(-p.limit), fetchedAt: r.fetchedAt, stale: r.stale };
}

async function fetchFromProvider(p: { asset: string; marketType: string; timeframe: Timeframe; limit: number }): Promise<Raw> {
  const provider = providerFor(p.marketType);
  try {
    if (provider === 'binance') {
      const symbol = toBinanceSymbol(p.asset);
      // data-api.binance.vision = endpoint market-data publik, tidak terkena geoblok api.binance.com
      const raw = await getJson(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${BINANCE_INTERVAL[p.timeframe]}&limit=${p.limit}`);
      return { provider, symbol, candles: parseBinanceKlines(raw) };
    }
    const key = env().TWELVEDATA_API_KEY;
    if (!key) throw new AppError('CONFIG_ERROR', 'TWELVEDATA_API_KEY belum diset di server.', 503, false);
    const symbol = toTwelveSymbol(p.asset);
    const raw = await getJson(
      `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${TWELVE_INTERVAL[p.timeframe]}&outputsize=${p.limit}&timezone=UTC&order=ASC`,
      { Authorization: `apikey ${key}` },
    );
    return { provider, symbol, candles: parseTwelveSeries(raw) };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw unavailable('Respons penyedia data harga tidak dapat dibaca.');
  }
}

/** Untuk /api/analyze: kegagalan data live TIDAK menggagalkan analisa — dilaporkan sebagai peringatan. */
export async function loadMarketContext(i: Pick<AnalyzeRequest, 'asset' | 'marketType' | 'timeframe'>): Promise<{ context: MarketContext | null; reason?: string }> {
  try {
    const r = await fetchCandles({ ...i, limit: 200 });
    const summary = summarize(r.candles);
    if (!summary) return { context: null, reason: 'Penyedia data tidak mengembalikan candle.' };
    return { context: { provider: r.provider, symbol: r.symbol, timeframe: i.timeframe, summary, fetchedAt: new Date(r.fetchedAt).toISOString(), stale: r.stale } };
  } catch (e) {
    return { context: null, reason: e instanceof AppError ? e.message : 'Data live tidak tersedia.' };
  }
}
