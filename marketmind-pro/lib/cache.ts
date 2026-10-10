// Cache bersama dengan: TTL segar, stale-on-error, dan single-flight (permintaan serentak ke kunci yang sama = 1 fetch).
// Murni (tanpa env/network) agar mudah diuji. Kegagalan store TIDAK PERNAH menggagalkan request.
export interface Entry<T> { value: T; fetchedAt: number }
export interface Store {
  get<T>(key: string): Promise<Entry<T> | null>;
  set<T>(key: string, entry: Entry<T>, ttlMs: number): Promise<void>;
}
export interface CacheResult<T> extends Entry<T> { stale: boolean }

export function memoryStore(maxKeys = 200, now: () => number = Date.now): Store {
  const m = new Map<string, { entry: Entry<unknown>; expires: number }>();
  return {
    async get<T>(key: string) {
      const hit = m.get(key);
      if (!hit) return null;
      if (hit.expires < now()) { m.delete(key); return null; }
      return hit.entry as Entry<T>;
    },
    async set<T>(key: string, entry: Entry<T>, ttlMs: number) {
      if (m.size >= maxKeys && !m.has(key)) m.delete(m.keys().next().value as string); // buang yang tertua
      m.set(key, { entry, expires: now() + ttlMs });
    },
  };
}

export function createCache(store: Store, opts: { now?: () => number; log?: (msg: string, err: unknown) => void } = {}) {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? ((m, e) => console.warn(m, e));
  const flights = new Map<string, Promise<CacheResult<unknown>>>();

  async function safeGet<T>(key: string) {
    try { return await store.get<T>(key); } catch (e) { log('[cache] get gagal', e); return null; }
  }

  /** ttlMs = berapa lama dianggap segar; staleMs = berapa lama data lama boleh dipakai saat provider error. */
  async function getOrFetch<T>(key: string, ttlMs: number, staleMs: number, fetcher: () => Promise<T>): Promise<CacheResult<T>> {
    const cached = await safeGet<T>(key);
    if (cached && now() - cached.fetchedAt < ttlMs) return { ...cached, stale: false };

    const running = flights.get(key);
    if (running) return running as Promise<CacheResult<T>>;

    const p = (async (): Promise<CacheResult<T>> => {
      try {
        const entry: Entry<T> = { value: await fetcher(), fetchedAt: now() };
        try { await store.set(key, entry, staleMs); } catch (e) { log('[cache] set gagal', e); }
        return { ...entry, stale: false };
      } catch (err) {
        if (cached && now() - cached.fetchedAt < staleMs) return { ...cached, stale: true };
        throw err;
      } finally {
        flights.delete(key);
      }
    })();
    flights.set(key, p);
    return p;
  }

  return { getOrFetch };
}
