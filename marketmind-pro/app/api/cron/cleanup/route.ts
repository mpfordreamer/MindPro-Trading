import { assertCron } from '@/lib/cronAuth';
import { AppError, errorResponse } from '@/lib/errors';
import { findOrphans, UNSAVED_RETENTION_MS, type StoredObject } from '@/lib/retention';
import { adminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Harian (vercel.json): hapus draft analisa >7 hari yang tidak disimpan, lalu gambar chart yatim >7 hari. */
export async function GET(req: Request) {
  const requestId = crypto.randomUUID();
  try {
    assertCron(req);
    const sb = adminClient();
    const cutoff = new Date(Date.now() - UNSAVED_RETENTION_MS).toISOString();
    const del = await sb.from('analyses').delete().eq('saved', false).lt('created_at', cutoff).select('id');
    if (del.error) throw new AppError('INTERNAL', 'Gagal membersihkan draft.', 500, true);

    // kumpulkan semua objek di bucket: root berisi folder per user
    const objects: StoredObject[] = [];
    const root = await sb.storage.from('charts').list('', { limit: 1000 });
    for (const folder of root.data ?? []) {
      if (folder.id !== null) continue; // bukan folder
      const files = await sb.storage.from('charts').list(folder.name, { limit: 1000 });
      for (const f of files.data ?? []) if (f.id) objects.push({ path: `${folder.name}/${f.name}`, createdAt: Date.parse(f.created_at) });
    }
    const referenced = new Set<string>();
    const old = objects.filter((o) => Date.now() - o.createdAt > UNSAVED_RETENTION_MS).map((o) => o.path);
    for (let i = 0; i < old.length; i += 100) {
      const chunk = old.slice(i, i + 100);
      const r = await sb.from('analyses').select('chart_paths').overlaps('chart_paths', chunk);
      if (r.error) throw new AppError('INTERNAL', 'Gagal memeriksa referensi gambar.', 500, true); // gagal tertutup: jangan hapus apa pun
      r.data?.forEach((row: { chart_paths: string[] }) => row.chart_paths.forEach((p) => referenced.add(p)));
    }
    const orphans = findOrphans(objects, referenced, Date.now());
    for (let i = 0; i < orphans.length; i += 100) await sb.storage.from('charts').remove(orphans.slice(i, i + 100));
    return Response.json({ data: { draftsDeleted: del.data?.length ?? 0, imagesDeleted: orphans.length } });
  } catch (e) {
    return errorResponse(e, requestId);
  }
}
