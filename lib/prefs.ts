import { z } from 'zod';
import { SORT_KEYS } from './agentFilter';

export const PREFS_KEY = 'mm:prefs:v1';

/**
 * Hanya preferensi tampilan yang disimpan. Filter (kata kunci/kategori/bias) sengaja TIDAK disimpan:
 * filter yang "menempel" bisa menyembunyikan agent tanpa disadari saat membaca konsensus.
 * Tiap field punya .catch(default): satu nilai rusak/usang tidak mereset preferensi lain. */
export const PrefsSchema = z.object({
  viewMode: z.enum(['detail', 'compact']).catch('detail'),
  sort: z.enum(SORT_KEYS).catch('default'),
});
export type Prefs = z.infer<typeof PrefsSchema>;
export const DEFAULT_PREFS: Prefs = Object.freeze({ viewMode: 'detail', sort: 'default' }) as Prefs;

/** Aman terhadap null, JSON rusak, tipe salah, dan field asing. Tidak pernah melempar. */
export function parsePrefs(raw: string | null | undefined): Prefs {
  if (!raw) return DEFAULT_PREFS;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return DEFAULT_PREFS; }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return DEFAULT_PREFS;
  return PrefsSchema.parse(data);
}
