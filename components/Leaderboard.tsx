'use client';
import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { AGENT_CATEGORIES } from '@/lib/agents';
import { MIN_SAMPLE, type AgentScore } from '@/lib/agentScore';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

interface LB { agents: AgentScore[]; outcomesCount: number; scoredCount: number }

export default function Leaderboard() {
  const { data, error, loading, reload } = useApi<LB>('/api/agents/leaderboard');
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');

  if (loading && !data) return <div role="status" aria-label="Memuat leaderboard" className="space-y-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (error) return <ErrorState error={error} onRetry={reload} retrying={loading} />;
  if (!data) return null;
  if (data.scoredCount === 0)
    return <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">Leaderboard terisi setelah Anda mengonfirmasi hasil trade (Win/Loss) di Jurnal. Breakeven tidak dihitung.</div>;

  const rows = data.agents.filter((a) => (cat === 'all' || a.category === cat) && (!q || a.name.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari agent…" aria-label="Cari agent" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter kategori" className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm">
          <option value="all">Semua kategori</option>
          {AGENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Leaderboard akurasi agent</caption>
          <thead className="text-xs text-slate-400"><tr><th scope="col" className="p-2">#</th><th scope="col" className="p-2">Agent</th><th scope="col" className="p-2">Akurasi</th><th scope="col" className="p-2" title="Batas bawah Wilson 95% — dipakai untuk peringkat agar sampel kecil tidak menipu">Skor (95%)</th><th scope="col" className="p-2">Benar/Salah</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.agentId} className="border-t border-slate-800">
                <td className="p-2 text-slate-400">{a.rank ?? '—'}</td>
                <td className="p-2"><span aria-hidden>{a.avatar}</span> {a.name} <span className="text-xs text-slate-400">{a.category}</span></td>
                <td className="p-2">{a.accuracy === null ? '—' : `${a.accuracy}%`}{a.lowSample && a.evaluated > 0 && <span className="ml-1 rounded bg-amber-500/15 px-1 text-[10px] text-amber-300">n&lt;{MIN_SAMPLE}</span>}</td>
                <td className="p-2">{a.wilsonLower === null ? '—' : `${a.wilsonLower}%`}</td>
                <td className="p-2 text-slate-400">{a.correct}/{a.wrong}{a.abstain > 0 && <span className="text-slate-400"> (+{a.abstain} abstain)</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">Dihitung dari {data.scoredCount} trade Win/Loss milik Anda. Agent dianggap benar jika biasnya searah dengan arah pasar yang tersirat dari hasil trade — ini perkiraan, bukan bukti kausal. Peringkat memakai batas bawah interval Wilson 95%.</p>
    </div>
  );
}
