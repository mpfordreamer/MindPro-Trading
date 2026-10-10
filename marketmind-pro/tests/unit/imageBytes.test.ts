import { describe, expect, it } from 'vitest';
import { detectImageMime } from '@/lib/imageBytes';

const pad = (b: number[]) => new Uint8Array([...b, ...new Array(Math.max(0, 12 - b.length)).fill(0)]);

describe('detectImageMime', () => {
  it('PNG', () => expect(detectImageMime(pad([0x89, 0x50, 0x4e, 0x47]))).toBe('image/png'));
  it('JPEG', () => expect(detectImageMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg'));
  it('WebP', () => expect(detectImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp'));
  it('menolak teks / file terlalu pendek', () => {
    expect(detectImageMime(new TextEncoder().encode('<html>bukan gambar</html>'))).toBeNull();
    expect(detectImageMime(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
