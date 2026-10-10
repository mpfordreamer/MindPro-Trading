import { apiRoute, z } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { must, parseQuery } from '@/lib/http';
import { renderReport } from '@/lib/pdf';
import { pdfFileName } from '@/lib/pdfFormat';
import type { AnalysisResult } from '@/types/analysis';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** PDF dibuat di server dari analisa milik user di database (bukan dari data kiriman klien). */
export const GET = apiRoute(async ({ req, sb, user, requestId, ip }) => {
  const { analysisId } = parseQuery(req, z.object({ analysisId: z.string().uuid() }));
  const row = must(await sb.from('analyses').select('result').eq('id', analysisId).maybeSingle(), 'pdf.analysis');
  if (!row) throw new AppError('NOT_FOUND', 'Analisa tidak ditemukan.', 404, false);
  const result = row.result as AnalysisResult;
  let buf: Buffer;
  try { buf = await renderReport(result); }
  catch (e) { console.error(`[${requestId}] pdf render`, e); throw new AppError('INTERNAL', 'Gagal membuat PDF. Coba lagi.', 500, true); }
  await logAudit({ userId: user.id, action: 'export.pdf', entity: analysisId, requestId, ip, meta: { bytes: buf.length } });
  return { response: new Response(new Uint8Array(buf), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${pdfFileName(result.asset, result.timeframe, result.meta.createdAt)}"`,
    'Cache-Control': 'private, no-store', 'x-request-id': requestId,
  } }) };
}, { rateLimit: 'share' });
