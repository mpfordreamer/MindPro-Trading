import { apiRoute, routeId, type DynCtx } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { must, parseBody } from '@/lib/http';
import { AnalysisPatchSchema } from '@/lib/validators';

export const runtime = 'nodejs';

export const GET = apiRoute<DynCtx>(async ({ ctx, sb }) => {
  const id = await routeId(ctx);
  const row = must(await sb.from('analyses').select('id,saved,result').eq('id', id).maybeSingle(), 'analyses.get');
  if (!row) throw new AppError('NOT_FOUND', 'Analisa tidak ditemukan.', 404, false);
  return { data: { ...row.result, analysisId: row.id, saved: row.saved } };
});

export const PATCH = apiRoute<DynCtx>(async ({ req, ctx, sb, user, requestId, ip }) => {
  const id = await routeId(ctx);
  const { saved } = await parseBody(req, AnalysisPatchSchema, 1_000);
  if (!saved) {
    const { count } = await sb.from('trade_journal').select('id', { count: 'exact', head: true }).eq('analysis_id', id);
    if (count) throw new AppError('CONFLICT', 'Analisa ini dipakai di jurnal trading dan tidak bisa dibatalkan simpanannya.', 409, false);
  }
  const row = must(await sb.from('analyses').update({ saved, saved_at: saved ? new Date().toISOString() : null }).eq('id', id).select('id,saved').maybeSingle(), 'analyses.patch');
  if (!row) throw new AppError('NOT_FOUND', 'Analisa tidak ditemukan.', 404, false);
  await logAudit({ userId: user.id, action: saved ? 'analysis.saved' : 'analysis.unsaved', entity: id, requestId, ip });
  return { data: row };
});

export const DELETE = apiRoute<DynCtx>(async ({ ctx, sb, user, requestId, ip }) => {
  const id = await routeId(ctx);
  const { data, error } = await sb.from('analyses').delete().eq('id', id).select('id');
  if (error?.code === '23503') throw new AppError('CONFLICT', 'Analisa ini dipakai di jurnal trading. Hapus entri jurnalnya dulu.', 409, false);
  must({ data, error }, 'analyses.delete');
  if (!data?.length) throw new AppError('NOT_FOUND', 'Analisa tidak ditemukan.', 404, false);
  await logAudit({ userId: user.id, action: 'analysis.deleted', entity: id, requestId, ip });
  return { data: { deleted: true } };
});
