import { highlightSegments } from '@/lib/agentFilter';

/** Sorot kata kunci dengan <mark>; teks dirender sebagai node React (bukan innerHTML) → aman dari XSS. */
export function Highlight({ text, query }: { text: string; query: string }) {
  return <>{highlightSegments(text, query).map((s, i) => s.match ? <mark key={i} className="rounded bg-amber-400/30 px-0.5 text-inherit">{s.text}</mark> : <span key={i}>{s.text}</span>)}</>;
}
