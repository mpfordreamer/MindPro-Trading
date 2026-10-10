import { AGENTS, AGENT_BY_ID, type AgentCategory } from './agents';

export type Bias = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export const BIASES: readonly Bias[] = ['BULLISH', 'BEARISH', 'NEUTRAL'];
export const SORT_KEYS = ['default', 'conviction', 'name', 'bias'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** Evaluasi AI (dari server) digabung dengan profil statis agent. */
export interface AgentView {
  id: string; name: string; role: string; category: AgentCategory; avatar: string; description: string;
  bias: Bias; conviction: number; argument: string; evidence: string[]; highlightedKey: string;
}
export interface EvalLike { id: string; bias: Bias; conviction: number; argument: string; evidence: string[]; highlightedKey: string }

export interface Clash { agentA: string; agentB: string; topic: string; argumentA: string; rebuttalB: string; resolution: string }

export interface AgentFilter { query: string; category: 'all' | AgentCategory; bias: 'all' | Bias }
export const EMPTY_FILTER: AgentFilter = { query: '', category: 'all', bias: 'all' };

/** Gabungkan evaluasi dengan profil. Id yang tidak dikenal dibuang (bukan dibuat-buat). Urutan = urutan profil. */
export function mergeAgents(evals: readonly EvalLike[]): AgentView[] {
  const byId = new Map(evals.map((e) => [e.id, e]));
  const out: AgentView[] = [];
  for (const p of AGENTS) {
    const e = byId.get(p.id);
    if (e) out.push({ ...p, bias: e.bias, conviction: e.conviction, argument: e.argument, evidence: e.evidence, highlightedKey: e.highlightedKey });
  }
  return out;
}

/** Huruf kecil + buang diakritik, agar "Fibonaçci" / "FIBONACCI" cocok. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
const tokens = (q: string) => normalize(q).split(/\s+/).filter(Boolean);

/** Semua kata kunci harus ditemukan (AND) di salah satu bidang teks agent. */
export function matchesQuery(a: AgentView, query: string): boolean {
  const t = tokens(query);
  if (!t.length) return true;
  const hay = normalize([a.name, a.role, a.category, a.description, a.argument, a.highlightedKey, ...a.evidence].join(' \n '));
  return t.every((w) => hay.includes(w));
}

const BIAS_ORDER: Record<Bias, number> = { BULLISH: 0, BEARISH: 1, NEUTRAL: 2 };

export function sortAgents(list: readonly AgentView[], sort: SortKey): AgentView[] {
  const idx = new Map<string, number>(AGENTS.map((a, i) => [a.id, i]));
  const base = (a: AgentView, b: AgentView) => (idx.get(a.id) ?? 0) - (idx.get(b.id) ?? 0);
  const copy = [...list];
  switch (sort) {
    case 'conviction': return copy.sort((a, b) => b.conviction - a.conviction || base(a, b));
    case 'name': return copy.sort((a, b) => a.name.localeCompare(b.name, 'id') || base(a, b));
    case 'bias': return copy.sort((a, b) => BIAS_ORDER[a.bias] - BIAS_ORDER[b.bias] || b.conviction - a.conviction || base(a, b));
    default: return copy.sort(base);
  }
}

export function filterAgents(list: readonly AgentView[], f: AgentFilter, sort: SortKey = 'default'): AgentView[] {
  return sortAgents(list.filter((a) => (f.category === 'all' || a.category === f.category) && (f.bias === 'all' || a.bias === f.bias) && matchesQuery(a, f.query)), sort);
}

export const isFilterActive = (f: AgentFilter) => f.query.trim() !== '' || f.category !== 'all' || f.bias !== 'all';

/**
 * Debat: cocok bila kata kunci ada di topik/argumen/sanggahan/resolusi/nama agent.
 * Bila filter kategori/bias aktif, hanya debat yang melibatkan minimal satu agent yang lolos filter tersebut.
 */
export function filterClashes(clashes: readonly Clash[], f: AgentFilter, visibleAgentIds: ReadonlySet<string>): Clash[] {
  const t = tokens(f.query);
  const agentFilterOn = f.category !== 'all' || f.bias !== 'all';
  return clashes.filter((c) => {
    if (agentFilterOn && !visibleAgentIds.has(c.agentA) && !visibleAgentIds.has(c.agentB)) return false;
    if (!t.length) return true;
    const hay = normalize([c.topic, c.argumentA, c.rebuttalB, c.resolution, AGENT_BY_ID[c.agentA]?.name ?? '', AGENT_BY_ID[c.agentB]?.name ?? ''].join(' \n '));
    return t.every((w) => hay.includes(w));
  });
}

export function countByBias(list: readonly Pick<AgentView, 'bias'>[]): Record<Bias, number> {
  const r: Record<Bias, number> = { BULLISH: 0, BEARISH: 0, NEUTRAL: 0 };
  for (const a of list) r[a.bias]++;
  return r;
}

/** Pecah teks menjadi segmen untuk menyorot kata kunci tanpa dangerouslySetInnerHTML (aman dari XSS). */
export function highlightSegments(text: string, query: string): { text: string; match: boolean }[] {
  const t = tokens(query);
  if (!t.length || !text) return [{ text, match: false }];
  // normalize() bisa mengubah panjang string (NFD) → petakan per karakter asli agar indeks tetap sejajar.
  const chars = [...text];
  const flags = new Array<boolean>(chars.length).fill(false);
  const norm = chars.map((c) => normalize(c));
  let joined = '';
  const owner: number[] = [];
  norm.forEach((n, i) => { joined += n; for (let k = 0; k < n.length; k++) owner.push(i); });
  for (const w of t) {
    let from = 0;
    for (;;) {
      const at = joined.indexOf(w, from);
      if (at === -1) break;
      for (let k = at; k < at + w.length; k++) flags[owner[k]!] = true;
      from = at + w.length;
    }
  }
  const out: { text: string; match: boolean }[] = [];
  chars.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.match === flags[i]) last.text += c; else out.push({ text: c, match: flags[i]! });
  });
  return out;
}
