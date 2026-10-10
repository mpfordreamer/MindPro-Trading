'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CandlestickSeries, ColorType, LineStyle, createChart, type IChartApi, type IPriceLine, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { ApiClientError } from '@/lib/apiClient';
import type { Candle } from '@/lib/marketMath';
import { ErrorState } from './ErrorState';

export interface ChartLevel { label: string; price: number; color: string }
interface Props { asset: string; marketType: string; timeframe: string; levels?: ChartLevel[] }

const POLL_MS = 30_000;
const toBar = (c: Candle) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close });

async function loadCandles(p: Omit<Props, 'levels'>, limit: number, signal: AbortSignal): Promise<{ candles: Candle[]; stale: boolean }> {
  const qs = new URLSearchParams({ asset: p.asset, marketType: p.marketType, timeframe: p.timeframe, limit: String(limit) });
  const res = await fetch(`/api/market/candles?${qs}`, { signal });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    const e = json?.error;
    throw new ApiClientError(e?.code ?? 'INTERNAL', e?.message ?? 'Gagal memuat chart.', e?.retryable ?? true, e?.requestId);
  }
  return { candles: json.data.candles as Candle[], stale: !!json.data.stale };
}

export default function LiveChart({ asset, marketType, timeframe, levels = [] }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lines = useRef<IPriceLine[]>([]);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    const c = createChart(box.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: '#020617' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      timeScale: { timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: '#334155' },
    });
    chart.current = c;
    series.current = c.addSeries(CandlestickSeries, { upColor: '#10b981', downColor: '#ef4444', borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#ef4444' });
    return () => { c.remove(); chart.current = null; series.current = null; lines.current = []; };
  }, []);

  const params = { asset, marketType, timeframe };
  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true); setError(null);
    try {
      const r = await loadCandles(params, 300, signal);
      series.current?.setData(r.candles.map(toBar));
      setStale(r.stale);
      chart.current?.timeScale().fitContent();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e instanceof ApiClientError ? e : new ApiClientError('INTERNAL', 'Gagal memuat chart.', true));
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, marketType, timeframe]);

  // muat awal + ulang saat aset/timeframe berubah atau user menekan Coba Lagi
  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load, attempt]);

  // polling candle terakhir; berhenti saat tab tidak terlihat
  useEffect(() => {
    if (error) return;
    const id = setInterval(async () => {
      if (document.hidden) return;
      try {
        const r = await loadCandles(params, 2, new AbortController().signal);
        r.candles.forEach((c) => series.current?.update(toBar(c)));
        setStale(r.stale);
      } catch { /* gagal sesaat diabaikan; chart tetap menampilkan data terakhir */ }
    }, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, marketType, timeframe, error]);

  // garis level entry/SL/TP
  useEffect(() => {
    const s = series.current;
    if (!s) return;
    lines.current.forEach((l) => s.removePriceLine(l));
    lines.current = levels.map((l) => s.createPriceLine({ price: l.price, color: l.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: l.label }));
  }, [levels]);

  return (
    <div className="space-y-2">
      <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-slate-800" role="img" aria-label={`Candlestick ${asset} ${timeframe}`}>
        <div ref={box} className="h-full w-full" />
        {loading && <div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-sm text-slate-400" role="status">Memuat chart…</div>}
      </div>
      {stale && <p role="status" className="text-xs text-amber-400">Data tertunda — penyedia harga sedang bermasalah, menampilkan data terakhir yang tersedia.</p>}
      {error && <ErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} retrying={loading} />}
    </div>
  );
}

/** Helper: bangun garis level dari hasil analisa. */
export function levelsFromSetup(t: { entryLow: number | null; entryHigh: number | null; stopLoss: number | null; takeProfit1: number | null; takeProfit2: number | null }): ChartLevel[] {
  const out: ChartLevel[] = [];
  if (t.entryLow !== null) out.push({ label: 'Entry L', price: t.entryLow, color: '#38bdf8' });
  if (t.entryHigh !== null) out.push({ label: 'Entry H', price: t.entryHigh, color: '#38bdf8' });
  if (t.stopLoss !== null) out.push({ label: 'SL', price: t.stopLoss, color: '#ef4444' });
  if (t.takeProfit1 !== null) out.push({ label: 'TP1', price: t.takeProfit1, color: '#10b981' });
  if (t.takeProfit2 !== null) out.push({ label: 'TP2', price: t.takeProfit2, color: '#34d399' });
  return out;
}
