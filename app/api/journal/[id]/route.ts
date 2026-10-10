import { apiRoute, routeId, type DynCtx } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { must } from '@/lib/http';

export const runtime = 'nodejs';

export const DELETE = apiRoute<DynCtx>(async ({ ctx, sb, user, requestId, ip }) => {
  const id = await routeId(ctx);
  const rows = must(await sb.from('trade_journal').delete().eq('id', id).select('id'), 'journal.delete'); // outcome ikut terhapus (cascade)
  if (!rows?.length) throw new AppError('NOT_FOUND', 'Entri jurnal tidak ditemukan.', 404, false);
  await logAudit({ userId: user.id, action: 'journal.deleted', entity: id, requestId, ip });
  return { data: { deleted: true } };
});
