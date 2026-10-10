import { describe, expect, it } from 'vitest';
import { createCache, memoryStore } from '@/lib/cache';

function setup() {
  let t = 1_000_000;
  const now = () => t;
  const cache = createCache(memoryStore(50, now), { now, log: () => {} });
  return { cache, advance: (ms: number) => { t += ms; } };
}
const TTL = 10_000, STALE = 300_000;

describe('createCache.getOrFetch', () => {
  it('memakai cache selama masih segar (provider dipanggil sekali)', async () => {
    const { cache, advance } = setup();
    let calls = 0;
    const f = async () => ++calls;
    const a = await cache.getOrFetch('k', TTL, STALE, f);
    advance(5_000);
    const b = await cache.getOrFetch('k', TTL, STALE, f);
    expect(calls).toBe(1);
    expect(b.value).toBe(a.value);
    expect(b.stale).toBe(false);
  });

  it('fetch ulang setelah TTL lewat', async () => {
    const { cache, advance } = setup();
    let calls = 0;
    const f = async () => ++calls;
    await cache.getOrFetch('k', TTL, STALE, f);
    advance(10_001);
    const r = await cache.getOrFetch('k', TTL, STALE, f);
    expect(calls).toBe(2);
    expect(r.value).toBe(2);
  });

  it('single-flight: 20 permintaan serentak = 1 panggilan provider', async () => {
    const { cache } = setup();
    let calls = 0;
    const f = async () => { calls++; await new Promise((r) => setTimeout(r, 20)); return 'x'; };
    const all = await Promise.all(Array.from({ length: 20 }, () => cache.getOrFetch('k', TTL, STALE, f)));
    expect(calls).toBe(1);
    expect(all.every((r) => r.value === 'x')).toBe(true);
  });

  it('kunci berbeda tidak saling berbagi', async () => {
    const { cache } = setup();
    let calls = 0;
    const f = async () => ++calls;
    await cache.getOrFetch('a', TTL, STALE, f);
    await cache.getOrFetch('b', TTL, STALE, f);
    expect(calls).toBe(2);
  });

  it('stale-on-error: provider gagal → data lama dengan stale=true', async () => {
    const { cache, advance } = setup();
    await cache.getOrFetch('k', TTL, STALE, async () => 'lama');
    advance(60_000);
    const r = await cache.getOrFetch('k', TTL, STALE, async () => { throw new Error('429'); });
    expect(r.value).toBe('lama');
    expect(r.stale).toBe(true);
  });

  it('melempar error bila tidak ada cache sama sekali', async () => {
    const { cache } = setup();
    let threw = false;
    try { await cache.getOrFetch('k', TTL, STALE, async () => { throw new Error('down'); }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it('data terlalu tua (> staleMs) tidak dipakai saat error', async () => {
    const { cache, advance } = setup();
    await cache.getOrFetch('k', TTL, 60_000, async () => 'lama');
    advance(61_000);
    let threw = false;
    try { await cache.getOrFetch('k', TTL, 60_000, async () => { throw new Error('down'); }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it('kegagalan store tidak menggagalkan request', async () => {
    const broken = { get: async () => { throw new Error('redis down'); }, set: async () => { throw new Error('redis down'); } };
    const cache = createCache(broken as never, { log: () => {} });
    const r = await cache.getOrFetch('k', TTL, STALE, async () => 42);
    expect(r.value).toBe(42);
  });

  it('error provider tidak mengotori single-flight berikutnya', async () => {
    const { cache } = setup();
    try { await cache.getOrFetch('k', TTL, STALE, async () => { throw new Error('x'); }); } catch { /* diharapkan */ }
    const r = await cache.getOrFetch('k', TTL, STALE, async () => 'pulih');
    expect(r.value).toBe('pulih');
  });
});
