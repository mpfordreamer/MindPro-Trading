'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_PREFS, PREFS_KEY, parsePrefs, type Prefs } from '@/lib/prefs';

// Store modul-level + useSyncExternalStore: tidak ada hydration mismatch (server selalu DEFAULT_PREFS,
// klien membaca localStorage setelah hydrate) dan sinkron antar-tab lewat event "storage".
let cachedRaw: string | null | undefined;
let cached: Prefs = DEFAULT_PREFS;
let storageBroken = false; // mode privat / kuota penuh → simpan di memori saja
const listeners = new Set<() => void>();

function getSnapshot(): Prefs {
  if (storageBroken) return cached;
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(PREFS_KEY); } catch { storageBroken = true; return cached; }
  if (raw !== cachedRaw) { cachedRaw = raw; cached = parsePrefs(raw); }
  return cached;
}
const getServerSnapshot = () => DEFAULT_PREFS;

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === PREFS_KEY || e.key === null) cb(); };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}

export function usePreferences() {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const update = useCallback((patch: Partial<Prefs>) => {
    const next = parsePrefs(JSON.stringify({ ...getSnapshot(), ...patch })); // validasi ulang sebelum disimpan
    const raw = JSON.stringify(next);
    try { window.localStorage.setItem(PREFS_KEY, raw); cachedRaw = raw; } catch { storageBroken = true; }
    cached = next;
    listeners.forEach((l) => l());
  }, []);
  return { prefs, update };
}

/** Hanya untuk test: kembalikan store ke keadaan awal. */
export function __resetPreferencesStore() { cachedRaw = undefined; cached = DEFAULT_PREFS; storageBroken = false; listeners.clear(); }
