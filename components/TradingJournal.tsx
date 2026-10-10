'use client';
import { useState } from 'react';
import { ApiClientError, apiDelete, apiPost } from '@/lib/apiClient';
import { useApi } from '@/hooks/useApi';
import type { JournalEntry, JournalResponse, Result } from '@/types/journal';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

const LABEL: Record<Result, string> = { win: 'Win', loss: 'Loss', breakeven: 'Breakeven' };
const COLOR: Record<Result, string> = { win: 'text-emerald-400', loss: 'text-red-400', breakeven: 'text-amber-400' };
const fmt = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '—' : `${n}${suffix}`);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd>{hint && <p className="text-[11px] text-slate-400">{hint}</p>}</div>;
}

function OutcomeForm({ entry, onDone }: { entry: JournalEntry; onDone: () => void }) {
  const [result, setResult] = useState<Result | null>(null);
  const [exit, setExit] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function confirm() {
    if (!result) return;
    setBusy(true); setErr(null);
    try { await apiPost(`/api/journal/${entry.id}/outcome`, { result, ...(exit ? { exitPrice: Number(exit) } : {}) }); onDone(); }
    catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Gagal menyimpan hasil.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="mt-2 space-y-2">
      <div role="group" aria-label="Hasil trade" className="flex flex-wrap gap-2">
        {(Object.keys(LABEL) as Result[]).map((r) => (
          <button key={r} onClick={() => setResult(r)} aria-pressed={result === r} className={`rounded-lg border px-3 py-1 text-xs ${result === r ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600'} ${COLOR[r]}`}>{LABEL[r]}</button>
        ))}
      </div>
      {result && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label>Harga exit (opsional) <input inputMode="decimal" value={exit} onChange={(e) => setExit(e.target.value)} className="ml-1 w-28 rounded border border-slate-700 bg-slate-950 px-2 py-1" /></label>
          <button onClick={confirm} disabled={busy} className="rounded-lg bg-emerald-500 px-3 py-1 font-medium text-slate-950 disabled:opacity-50">{busy ? '…' : 'Konfirmasi'}</button>
        </div>
      )}
      {err && <p role="alert" className="text-xs text-red-400">{err}</p>}
    </div>
  );
}

export default function TradingJournal() {
  const { data, error, loading, reload } = useApi<JournalResponse>('/api/journal?status=all');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [q, setQ] = useState('');
  const [delErr, setDelErr] = useState<string | null>(null);

  if (loading && !data) return <div className="space-y-3" role="status" aria-label="Memuat jurnal"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div><Skeleton className="h-40" /></div>;
  if (error) return <ErrorState error={error} onRetry={reload} retrying={loading} />;
  if (!data) return null;

  const { stats, entries } = data;
  const shown = entries.filter((e) => (filter === 'all' || e.status === filter) && (!q || `${e.analysis?.asset ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  async function remove(id: string) {
    if (!confirm('Hapus entri jurnal ini beserta hasilnya?')) return;
    setDelErr(null);
    try { await apiDelete(`/api/journal/${id}`); reload(); } catch (e) { setDelErr(e instanceof ApiClientError ? e.message : 'Gagal menghapus.'); }
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total analisa (tersimpan)" value={String(stats.totalAnalyses)} />
        <Stat label="Win rate" value={fmt(stats.winRate, '%')} hint={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE — BE tidak dihitung`} />
        <Stat label="Rata-rata R:R rencana" value={stats.avgPlannedRR ? `1:${stats.avgPlannedRR}` : '—'} hint={stats.avgR !== null ? `R aktual rata-rata: ${stats.avgR}` : undefined} />
        <Stat label="Profit factor" value={stats.profitFactor !== null ? String(stats.profitFactor) : stats.grossProfitR > 0 ? '∞' : '—'} hint={stats.profitFactor === null && stats.grossProfitR > 0 ? 'belum ada loss' : `+${stats.grossProfitR}R / −${stats.grossLossR}R`} />
        <Stat label="Trade tercatat" value={String(stats.totalTrades)} />
        <Stat label="Terbuka" value={String(stats.openTrades)} />
        <Stat label="R terbaik" value={fmt(stats.bestR, 'R')} />
        <Stat label="R terburuk" value={fmt(stats.worstR, 'R')} />
      </dl>
      {stats.closedTrades > 0 && stats.closedTrades < 20 && <p className="text-xs text-amber-400">Baru {stats.closedTrades} trade tertutup — statistik belum representatif (disarankan ≥ 30).</p>}

      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari aset…" aria-label="Cari aset" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm" />
        <div role="group" aria-label="Filter status" className="flex gap-1">
          {(['all', 'open', 'closed'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-lg px-3 py-1 text-xs ${filter === f ? 'bg-slate-700' : 'border border-slate-700'}`}>{f === 'all' ? 'Semua' : f === 'open' ? 'Terbuka' : 'Tertutup'}</button>)}
        </div>
      </div>
      {delErr && <p role="alert" className="text-sm text-red-400">{delErr}</p>}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
          {entries.length === 0 ? 'Belum ada trade di jurnal. Jalankan analisa lalu pilih “Tambah ke jurnal”.' : 'Tidak ada entri yang cocok dengan filter.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((e) => (
            <li key={e.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><b>{e.analysis?.asset ?? '—'}</b> <span className="text-slate-400">{e.analysis?.timeframe}</span> <span className={e.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}>{e.direction}</span></div>
                <div className="flex items-center gap-3">
                  {e.outcome ? <span className={`font-medium ${COLOR[e.outcome.result]}`}>{LABEL[e.outcome.result]} · {e.outcome.r_multiple > 0 ? '+' : ''}{e.outcome.r_multiple}R</span> : <span className="text-xs text-slate-400">Terbuka</span>}
                  <button onClick={() => remove(e.id)} aria-label={`Hapus entri ${e.analysis?.asset ?? ''}`} className="text-xs text-slate-400 underline hover:text-red-400">Hapus</button>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">Entry {e.entry_price} · SL {e.stop_loss} · TP {e.take_profit} · R:R 1:{e.planned_rr} · {new Date(e.created_at).toLocaleDateString('id-ID')}</p>
              {e.notes && <p className="mt-1 text-xs text-slate-300">{e.notes}</p>}
              {e.status === 'open' ? <OutcomeForm entry={e} onDone={reload} /> : <details className="mt-1 text-xs text-slate-400"><summary className="cursor-pointer">Koreksi hasil</summary><OutcomeForm entry={e} onDone={reload} /></details>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-slate-400">Bukan nasihat keuangan. Hasil masa lalu tidak menjamin hasil di masa depan.</p>
    </div>
  );
}
