'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AGENT_BY_ID, AGENT_CATEGORIES } from '@/lib/agents';
import { BIASES, countByBias, filterAgents, filterClashes, isFilterActive, mergeAgents, type AgentFilter, type Bias, type SortKey } from '@/lib/agentFilter';
import { usePreferences } from '@/hooks/usePreferences';
import type { AnalysisResult } from '@/types/analysis';
import { AgentCard } from './AgentCard';
import { biasLabel } from './BiasBadge';
import { CompactAgentTable } from './CompactAgentTable';
import { EmptyState } from './EmptyState';
import { Highlight } from './Highlight';
import { QuickFilter } from './QuickFilter';

type Data = Pick<AnalysisResult, 'agentEvaluations' | 'debate' | 'consensus'>;
const SORT_LABEL: Record<SortKey, string> = { default: 'Urutan kategori', conviction: 'Keyakinan tertinggi', name: 'Nama A–Z', bias: 'Bias' };
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${on ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`;
const field = 'rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400';

export default function DebateArena({ result }: { result: Data }) {
  const { prefs, update } = usePreferences();
  const [filter, setFilter] = useState<AgentFilter>({ query: '', category: 'all', bias: 'all' });
  const searchRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => mergeAgents(result.agentEvaluations), [result.agentEvaluations]);
  const shown = useMemo(() => filterAgents(all, filter, prefs.sort), [all, filter, prefs.sort]);
  const clashes = useMemo(() => filterClashes(result.debate.clashes, filter, new Set(shown.map((a) => a.id))), [result.debate.clashes, filter, shown]);
  const counts = useMemo(() => countByBias(all), [all]);
  const active = isFilterActive(filter);
  const reset = () => setFilter({ query: '', category: 'all', bias: 'all' });

  // Pintasan "/" untuk fokus ke pencarian (diabaikan saat sedang mengetik di kolom lain).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      e.preventDefault(); searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { bullishPct: bu, bearishPct: be, neutralPct: ne } = result.consensus;
  return (
    <section aria-labelledby="debate-title" className="space-y-4">
      <div>
        <h2 id="debate-title" className="text-lg font-semibold text-slate-100">Debate Arena</h2>
        <p className="mt-1 text-sm text-slate-300">{result.debate.summary}</p>
        <div role="img" aria-label={`Konsensus ${all.length} agent: ${bu}% bullish, ${ne}% netral, ${be}% bearish`} className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="bg-emerald-400" style={{ width: `${bu}%` }} /><div className="bg-slate-500" style={{ width: `${ne}%` }} /><div className="bg-red-400" style={{ width: `${be}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-400">{bu}% bullish · {ne}% netral · {be}% bearish — dihitung dari semua {all.length} agent, tidak terpengaruh filter di bawah.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <QuickFilter value={filter.query} onChange={(query) => setFilter((f) => ({ ...f, query }))} inputRef={searchRef} />
          <label className="sr-only" htmlFor="f-cat">Kategori</label>
          <select id="f-cat" value={filter.category} onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value as AgentFilter['category'] }))} className={field}>
            <option value="all">Semua kategori</option>
            {AGENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-sort">Urutkan</label>
          <select id="f-sort" value={prefs.sort} onChange={(e) => update({ sort: e.target.value as SortKey })} className={field}>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
          </select>
          <div role="group" aria-label="Mode tampilan" className="inline-flex overflow-hidden rounded-lg border border-slate-700">
            {(['detail', 'compact'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={prefs.viewMode === m} onClick={() => update({ viewMode: m })}
                className={`px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-400 ${prefs.viewMode === m ? 'bg-emerald-400/15 text-emerald-200' : 'text-slate-300 hover:bg-slate-800'}`}>
                {m === 'detail' ? 'Detail' : 'Ringkas'}
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label="Filter bias" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={filter.bias === 'all'} onClick={() => setFilter((f) => ({ ...f, bias: 'all' }))} className={chip(filter.bias === 'all')}>Semua ({all.length})</button>
          {BIASES.map((b: Bias) => (
            <button key={b} type="button" aria-pressed={filter.bias === b} onClick={() => setFilter((f) => ({ ...f, bias: f.bias === b ? 'all' : b }))} className={chip(filter.bias === b)}>{biasLabel(b)} ({counts[b]})</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="status" aria-live="polite" className="text-xs text-slate-400">Menampilkan {shown.length} dari {all.length} agent{filter.query.trim() ? ` · ${clashes.length} debat cocok` : ''}</p>
          {active && <button type="button" onClick={reset} className="text-xs text-emerald-300 underline underline-offset-2 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">Reset filter</button>}
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Tidak ada agent yang cocok" hint="Coba kata kunci lain atau longgarkan filter kategori/bias." action={<button type="button" onClick={reset} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Reset filter</button>} />
      ) : prefs.viewMode === 'compact' ? (
        <CompactAgentTable agents={shown} query={filter.query} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{shown.map((a) => <li key={a.id} className="flex"><div className="flex w-full"><AgentCard agent={a} query={filter.query} /></div></li>)}</ul>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Benturan argumen</h3>
        {clashes.length === 0 ? (
          <EmptyState title={result.debate.clashes.length === 0 ? 'Tidak ada benturan argumen' : 'Tidak ada debat yang cocok dengan filter'} />
        ) : (
          <ul className="space-y-3">
            {clashes.map((c, i) => (
              <li key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
                <p className="font-medium text-slate-100"><Highlight text={c.topic} query={filter.query} /></p>
                <p className="mt-2 text-slate-300"><span className="font-medium text-emerald-300">{AGENT_BY_ID[c.agentA]?.name ?? c.agentA}:</span> <Highlight text={c.argumentA} query={filter.query} /></p>
                <p className="mt-2 text-slate-300"><span className="font-medium text-sky-300">{AGENT_BY_ID[c.agentB]?.name ?? c.agentB}:</span> <Highlight text={c.rebuttalB} query={filter.query} /></p>
                <p className="mt-2 border-t border-slate-800 pt-2 text-slate-400"><span className="font-medium text-slate-300">Resolusi:</span> <Highlight text={c.resolution} query={filter.query} /></p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
