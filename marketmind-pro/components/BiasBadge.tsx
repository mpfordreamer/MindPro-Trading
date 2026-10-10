import type { Bias } from '@/lib/agentFilter';

// Warna + simbol + teks: informasi tidak bergantung pada warna saja (WCAG 1.4.1).
const CFG: Record<Bias, { label: string; icon: string; cls: string }> = {
  BULLISH: { label: 'Bullish', icon: '▲', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  BEARISH: { label: 'Bearish', icon: '▼', cls: 'bg-red-500/15 text-red-300 ring-red-500/30' },
  NEUTRAL: { label: 'Netral', icon: '●', cls: 'bg-slate-500/15 text-slate-300 ring-slate-500/40' },
};
export const biasLabel = (b: Bias) => CFG[b].label;

export function BiasBadge({ bias }: { bias: Bias }) {
  const c = CFG[bias];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${c.cls}`}><span aria-hidden>{c.icon}</span>{c.label}</span>;
}
