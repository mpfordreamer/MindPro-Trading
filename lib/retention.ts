export const UNSAVED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export interface StoredObject { path: string; createdAt: number }

/** Gambar yang lebih tua dari batas DAN tidak direferensikan analisa mana pun = yatim, boleh dihapus. */
export function findOrphans(objects: StoredObject[], referenced: Set<string>, now: number, maxAgeMs = UNSAVED_RETENTION_MS): string[] {
  return objects.filter((o) => now - o.createdAt > maxAgeMs && !referenced.has(o.path)).map((o) => o.path);
}
