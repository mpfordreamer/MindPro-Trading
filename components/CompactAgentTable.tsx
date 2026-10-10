'use client';
import { Fragment, useState } from 'react';
import type { AgentView } from '@/lib/agentFilter';
import { BiasBadge } from './BiasBadge';
import { Highlight } from './Highlight';

/** Ringkas: 25 agent dalam satu layar. Klik baris untuk melihat argumen lengkap. */
export function CompactAgentTable({ agents, query = '' }: { agents: AgentView[]; query?: string }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[20rem] text-left text-sm">
        <caption className="sr-only">Ringkasan bias dan keyakinan agent. Aktifkan nama agent untuk membuka argumennya.</caption>
        <thead className="bg-slate-900 text-xs text-slate-400">
          <tr>
            <th scope="col" className="p-2">Agent</th>
            <th scope="col" className="hidden p-2 sm:table-cell">Kategori</th>
            <th scope="col" className="p-2">Bias</th>
            <th scope="col" className="p-2 text-right">Keyakinan</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((a) => {
            const expanded = open.has(a.id);
            const panel = `agent-detail-${a.id}`;
            return (
              <Fragment key={a.id}>
                <tr className="border-t border-slate-800">
                  <th scope="row" className="p-0 font-normal">
                    <button type="button" onClick={() => toggle(a.id)} aria-expanded={expanded} aria-controls={panel}
                      className="flex w-full items-center gap-2 p-2 text-left hover:bg-slate-800/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-400">
                      <span aria-hidden className="text-slate-400">{expanded ? '▾' : '▸'}</span>
                      <span aria-hidden>{a.avatar}</span>
                      <span className="text-slate-100"><Highlight text={a.name} query={query} /></span>
                    </button>
                  </th>
                  <td className="hidden p-2 text-slate-400 sm:table-cell">{a.category}</td>
                  <td className="p-2"><BiasBadge bias={a.bias} /></td>
                  <td className="p-2 text-right tabular-nums text-slate-200">{a.conviction}</td>
                </tr>
                {expanded && (
                  <tr id={panel} className="bg-slate-900/50">
                    <td colSpan={4} className="px-4 py-3 text-sm text-slate-300">
                      <p className="mb-1 text-xs text-slate-400">{a.role}</p>
                      <p><Highlight text={a.argument} query={query} /></p>
                      {a.evidence.length > 0 && <ul className="mt-2 list-inside list-disc text-xs text-slate-400">{a.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
