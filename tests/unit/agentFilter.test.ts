import { describe, expect, it } from 'vitest';
import { countByBias, filterAgents, filterClashes, highlightSegments, isFilterActive, matchesQuery, mergeAgents, normalize, sortAgents, EMPTY_FILTER } from '@/lib/agentFilter';
import { AGENTS } from '@/lib/agents';
import { fixtureClashes, fixtureEvaluations } from '../fixtures/analysis';

const all = mergeAgents(fixtureEvaluations);

describe('mergeAgents', () => {
  it('menggabungkan 25 agent sesuai urutan profil', () => {
    expect(all).toHaveLength(25);
    expect(all.map((a) => a.id)).toEqual(AGENTS.map((a) => a.id));
  });
  it('membuang id tak dikenal, tidak mengarang agent', () => {
    const out = mergeAgents([...fixtureEvaluations.slice(0, 2), { ...fixtureEvaluations[0]!, id: 'hantu' }]);
    expect(out).toHaveLength(2);
  });
});

describe('matchesQuery', () => {
  it('kosong = cocok semua', () => expect(all.every((a) => matchesQuery(a, '   '))).toBe(true));
  it('tidak peka huruf besar & diakritik', () => {
    expect(normalize('Fibonaçci')).toBe('fibonacci');
    expect(filterAgents(all, { ...EMPTY_FILTER, query: 'FIBONACCI' }).map((a) => a.id)).toContain('harmonic_trader');
  });
  it('banyak kata = AND', () => {
    expect(filterAgents(all, { ...EMPTY_FILTER, query: 'order block' }).map((a) => a.id)).toContain('ict_smart_money');
    expect(filterAgents(all, { ...EMPTY_FILTER, query: 'order zzzxxx' })).toHaveLength(0);
  });
  it('mencari di argumen dan evidence', () => {
    expect(filterAgents(all, { ...EMPTY_FILTER, query: 'penolakan di zona' }).length).toBeGreaterThan(0);
  });
});

describe('filterAgents', () => {
  it('filter kategori', () => {
    const r = filterAgents(all, { ...EMPTY_FILTER, category: 'Quantitative' });
    expect(r).toHaveLength(5);
    expect(r.every((a) => a.category === 'Quantitative')).toBe(true);
  });
  it('filter bias', () => {
    const r = filterAgents(all, { ...EMPTY_FILTER, bias: 'BEARISH' });
    expect(r.length).toBe(countByBias(all).BEARISH);
    expect(r.every((a) => a.bias === 'BEARISH')).toBe(true);
  });
  it('kombinasi tanpa hasil → array kosong', () => {
    expect(filterAgents(all, { query: 'tidak-ada-yang-cocok', category: 'Institutional', bias: 'BULLISH' })).toEqual([]);
  });
  it('tidak memutasi input', () => {
    const before = all.map((a) => a.id).join();
    filterAgents(all, EMPTY_FILTER, 'conviction');
    expect(all.map((a) => a.id).join()).toBe(before);
  });
});

describe('sortAgents', () => {
  it('conviction menurun', () => {
    const r = sortAgents(all, 'conviction').map((a) => a.conviction);
    expect(r).toEqual([...r].sort((a, b) => b - a));
  });
  it('nama A–Z', () => {
    const r = sortAgents(all, 'name').map((a) => a.name);
    expect(r).toEqual([...r].sort((a, b) => a.localeCompare(b, 'id')));
  });
  it('bias: bullish → bearish → neutral', () => {
    const r = sortAgents(all, 'bias').map((a) => a.bias);
    const rank = { BULLISH: 0, BEARISH: 1, NEUTRAL: 2 } as const;
    expect(r.map((b) => rank[b])).toEqual(r.map((b) => rank[b]).sort((a, b) => a - b));
  });
  it('default mengembalikan urutan profil', () => expect(sortAgents([...all].reverse(), 'default').map((a) => a.id)).toEqual(all.map((a) => a.id)));
});

describe('filterClashes', () => {
  const ids = new Set(all.map((a) => a.id));
  it('tanpa filter → semua', () => expect(filterClashes(fixtureClashes, EMPTY_FILTER, ids)).toHaveLength(2));
  it('cari topik', () => expect(filterClashes(fixtureClashes, { ...EMPTY_FILTER, query: 'cpi' }, ids)).toHaveLength(1));
  it('cari nama agent', () => expect(filterClashes(fixtureClashes, { ...EMPTY_FILTER, query: 'central bank' }, ids)).toHaveLength(1));
  it('filter agent aktif → hanya debat yang melibatkan agent yang lolos', () => {
    const f = { ...EMPTY_FILTER, category: 'Fundamental' as const };
    const visible = new Set(filterAgents(all, f).map((a) => a.id));
    const r = filterClashes(fixtureClashes, f, visible);
    expect(r).toHaveLength(1);
    expect(r[0]!.topic).toBe('Dampak rilis CPI');
  });
});

describe('isFilterActive & countByBias', () => {
  it('mendeteksi filter', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, query: ' x ' })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, bias: 'NEUTRAL' })).toBe(true);
  });
  it('jumlah per bias = 25', () => { const c = countByBias(all); expect(c.BULLISH + c.BEARISH + c.NEUTRAL).toBe(25); });
});

describe('highlightSegments', () => {
  it('menandai kecocokan tanpa kehilangan teks', () => {
    const s = highlightSegments('Order Block bullish', 'block');
    expect(s.map((x) => x.text).join('')).toBe('Order Block bullish');
    expect(s.filter((x) => x.match).map((x) => x.text)).toEqual(['Block']);
  });
  it('tanpa query → satu segmen', () => expect(highlightSegments('abc', '')).toEqual([{ text: 'abc', match: false }]));
  it('aman terhadap karakter regex & HTML (tidak dieksekusi)', () => {
    const s = highlightSegments('a.*b <script>', '.*');
    expect(s.map((x) => x.text).join('')).toBe('a.*b <script>');
    expect(s.find((x) => x.match)?.text).toBe('.*');
  });
  it('diakritik: indeks tetap sejajar', () => {
    const s = highlightSegments('Fibonaçci ratio', 'fibonacci');
    expect(s.map((x) => x.text).join('')).toBe('Fibonaçci ratio');
    expect(s.find((x) => x.match)?.text).toBe('Fibonaçci');
  });
  it('menggabungkan beberapa kata', () => expect(highlightSegments('aa bb cc', 'aa cc').filter((x) => x.match).map((x) => x.text)).toEqual(['aa', 'cc']));
});
