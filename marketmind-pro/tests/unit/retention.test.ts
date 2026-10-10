import { describe, expect, it } from 'vitest';
import { findOrphans, UNSAVED_RETENTION_MS } from '@/lib/retention';

describe('findOrphans', () => {
  const now = 10 * UNSAVED_RETENTION_MS;
  const objs = [
    { path: 'u/old-ref.jpg', createdAt: now - UNSAVED_RETENTION_MS - 1000 },
    { path: 'u/old-orphan.jpg', createdAt: now - UNSAVED_RETENTION_MS - 1000 },
    { path: 'u/new-orphan.jpg', createdAt: now - 1000 },
  ];
  it('hanya yang tua DAN tidak direferensikan', () => {
    expect(findOrphans(objs, new Set(['u/old-ref.jpg']), now).join()).toBe('u/old-orphan.jpg');
  });
  it('gambar baru (sedang dipakai upload) tidak pernah dihapus', () => {
    expect(findOrphans([objs[2]], new Set(), now).length).toBe(0);
  });
});
