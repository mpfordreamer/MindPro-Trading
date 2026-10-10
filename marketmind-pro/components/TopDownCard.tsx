import type { AnalysisResult } from '@/types/analysis';

const TREND: Record<string, string> = { BULLISH: 'text-emerald-400', BEARISH: 'text-red-400', RANGING: 'text-amber-400' };
const ALIGN: Record<string, string> = { ALIGNED: 'bg-emerald-500/15 text-emerald-300', MIXED: 'bg-amber-500/15 text-amber-300', CONFLICTING: 'bg-red-500/15 text-red-300', NOT_AVAILABLE: 'bg-slate-700 text-slate-300' };
const ORDER = ['1W', '1D', '4H', '1H', '15M'];

export function TopDownCard({ result }: { result: AnalysisResult }) {
  const tfs = [...result.timeframeAnalysis].sort((a, b) => ORDER.indexOf(a.timeframe) - ORDER.indexOf(b.timeframe));
  return (
    <section aria-labelledby="topdown-h" className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="topdown-h" className="font-semibold">Analisa Top-Down</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ALIGN[result.topDown.alignment]}`}>{result.topDown.alignment.replace('_', ' ')}</span>
      </div>
      <p className="text-sm text-slate-300">{result.topDown.primaryTrend}</p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {tfs.map((t) => (
          <li key={t.timeframe} className="rounded-lg border border-slate-800 p-3 text-sm">
            <div className="mb-1 flex justify-between"><b>{t.timeframe}</b><span className={TREND[t.trend]}>{t.trend}</span></div>
            <p className="text-slate-400">{t.summary}</p>
            {t.zones.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {t.zones.map((z, i) => <li key={i}>{z.type.replaceAll('_', ' ')}: {z.low ?? '?'} – {z.high ?? '?'}</li>)}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm"><b className="text-sky-300">Trigger entry:</b> <span className="text-slate-300">{result.topDown.entryTrigger}</span></p>

      {result.marketData && (
        <div className="border-t border-slate-800 pt-3 text-xs text-slate-400">
          <p>Harga live {result.marketData.symbol} ({result.marketData.provider}): <b className="text-slate-200">{result.marketData.summary.livePrice}</b></p>
          {result.levelChecks.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {result.levelChecks.map((c, i) => (
                <li key={i}>
                  <span aria-hidden>{c.status === 'ok' ? '✅' : c.status === 'far' ? '⚠️' : '⛔'}</span>{' '}
                  <span className="sr-only">{c.status}: </span>{c.label}: {c.price} ({c.deviationPct}% dari live)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!result.setupReliable && <p role="alert" className="rounded-lg bg-red-500/10 p-2 text-sm text-red-300">Setup ditandai tidak andal: level entry/SL tidak sesuai harga live. Jangan dipakai tanpa verifikasi manual.</p>}
    </section>
  );
}
