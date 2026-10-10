import 'server-only';
import { AppError } from './errors';
import { detectImageMime, type ImageMime } from './imageBytes';
import { createClient } from './supabase/server';
import { TF_RANK, type Timeframe } from './validators';

export const MAX_CHART_BYTES = 3 * 1024 * 1024;
export interface LoadedChart { timeframe: Timeframe; mimeType: ImageMime; data: string }

/** Unduh gambar milik user dari Storage (RLS ikut berlaku), verifikasi isi file, urutkan timeframe tinggi → rendah. */
export async function loadChartImages(userId: string, charts: { timeframe: Timeframe; path: string }[]): Promise<LoadedChart[]> {
  if (!charts.length) return [];
  const sb = await createClient();
  const sorted = [...charts].sort((a, b) => TF_RANK[b.timeframe] - TF_RANK[a.timeframe]);
  return Promise.all(
    sorted.map(async (c) => {
      if (!c.path.startsWith(`${userId}/`)) throw new AppError('INVALID_REQUEST', 'Gambar bukan milik akun ini.', 400, false);
      const { data, error } = await sb.storage.from('charts').download(c.path);
      if (error || !data) throw new AppError('INVALID_REQUEST', `Gambar ${c.timeframe} tidak ditemukan. Unggah ulang.`, 400, false);
      if (data.size > MAX_CHART_BYTES) throw new AppError('PAYLOAD_TOO_LARGE', `Gambar ${c.timeframe} lebih dari 3MB.`, 413, false);
      const bytes = new Uint8Array(await data.arrayBuffer());
      const mime = detectImageMime(bytes);
      if (!mime) throw new AppError('INVALID_REQUEST', `File ${c.timeframe} bukan gambar PNG/JPG/WebP valid.`, 400, false);
      return { timeframe: c.timeframe, mimeType: mime, data: Buffer.from(bytes).toString('base64') };
    }),
  );
}
