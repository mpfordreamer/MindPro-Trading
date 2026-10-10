import { memo } from 'react';
import type { AgentView } from '@/lib/agentFilter';
import { BiasBadge } from './BiasBadge';
import { Highlight } from './Highlight';

const BAR: Record<AgentView['bias'], string> = { BULLISH: 'bg-emerald-400', BEARISH: 'bg-red-400', NEUTRAL: 'bg-slate-400' };

export const AgentCard = memo(function AgentCard({ agent, query = '' }: { agent: AgentView; query?: string }) {
  const titleId = `agent-${agent.id}`;
  return (
    <article aria-labelledby={titleId} className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <header className="flex items-start gap-3">
        <span aria-hidden className="text-2xl leading-none">{agent.avatar}</span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-sm font-semibold text-slate-100"><Highlight text={agent.name} query={query} /></h3>
          <p className="text-xs text-slate-400">{agent.role} · {agent.category}</p>
        </div>
        <BiasBadge bias={agent.bias} />
      </header>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <span>Keyakinan</span>
        <div role="meter" aria-label={`Keyakinan ${agent.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={agent.conviction} aria-valuetext={`${agent.conviction} dari 100`} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
          <div className={`h-full ${BAR[agent.bias]}`} style={{ width: `${agent.conviction}%` }} />
        </div>
        <span className="w-8 text-right tabular-nums text-slate-200">{agent.conviction}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300"><Highlight text={agent.argument} query={query} /></p>
      {agent.evidence.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-xs text-slate-400">
          {agent.evidence.map((e, i) => <li key={i} className="flex gap-1.5"><span aria-hidden>•</span><span><Highlight text={e} query={query} /></span></li>)}
        </ul>
      )}
    </article>
  );
});
