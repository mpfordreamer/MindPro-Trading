import { apiRoute, z } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { must, one, parseBody, parseQuery } from '@/lib/http';
import { computeStats, directionFromBias, validatePlan, type Plan } from '@/lib/journalMath';
import { JournalCreateSchema } from '@/lib/validators';

export const runtime = 'nodejs';

const Q = z.object({ status: z.enum(['all', 'open', 'closed']).default('all'), limit: z.coerce.number().int().min(1).max(100).default(50) });

export const GET = apiRoute(async ({ req, sb }) => {
  const q = parseQuery(req, Q);
  let list = sb.from('trade_journal')
    .select('id,analysis_id,direction,entry_price,stop_loss,take_profit,planned_rr,notes,status,created_at,closed_at,analysis:analyses(asset,timeframe,decision,confidence),outcome:trade_outcomes(result,exit_price,r_multiple,closed_at,notes)')
    .order('created_at', { ascending: false }).limit(q.limit);
  if (q.status !== 'all') list = list.eq('status', q.status);

  const [rows, outcomes, analyses, trades] = await Promise.all([
    list,
    sb.from('trade_outcomes').select('result,r_multiple,planned_rr').limit(2000),
    sb.from('analyses').select('id', { count: 'exact', head: true }).eq('saved', true),
    sb.from('trade_journal').select('id', { count: 'exact', head: true }),
  ]);
  const entries = must(rows, 'journal.list').map((r: Record<string, unknown>) => ({ ...r, analysis: one(r.analysis as never), outcome: one(r.outcome as never) }));
  const closed = must(outcomes, 'journal.outcomes').map((o: { result: 'win' | 'loss' | 'breakeven'; r_multiple: number; planned_rr: number | null }) => ({ result: o.result, rMultiple: Number(o.r_multiple), plannedRR: o.planned_rr === null ? null : Number(o.planned_rr) }));
  must({ data: 1, error: analyses.error ?? trades.error }, 'journal.counts');
  return { data: { entries, stats: computeStats(closed, { analyses: analyses.count ?? 0, trades: trades.count ?? 0 }) } };
});

export const POST = apiRoute(async ({ req, sb, user, requestId, ip }) => {
  const input = await parseBody(req, JournalCreateSchema, 10_000);
  const a = must(await sb.from('analyses').select('id,bias,entry_low,entry_high,stop_loss,take_profit_1,setup_reliable').eq('id', input.analysisId).maybeSingle(), 'journal.analysis');
  if (!a) throw new AppError('NOT_FOUND', 'Analisa tidak ditemukan.', 404, false);

  const aiDir = directionFromBias(a.bias);
  const direction = input.direction ?? aiDir;
  const dflt = (n: unknown) => (n === null || n === undefined ? undefined : Number(n));
  const entry = input.entryPrice ?? dflt(direction === 'LONG' ? a.entry_high : a.entry_low); // konservatif, sama dengan perhitungan R:R analisa
  const stopLoss = input.stopLoss ?? dflt(a.stop_loss);
  const takeProfit = input.takeProfit ?? dflt(a.take_profit_1);
  if (!direction || entry === undefined || stopLoss === undefined || takeProfit === undefined)
    throw new AppError('INVALID_REQUEST', 'Analisa ini tidak punya setup lengkap. Isi arah, entry, SL, dan TP secara manual.', 400, false);

  const plan: Plan = { direction, entry, stopLoss, takeProfit };
  const check = validatePlan(plan);
  if (check.errors.length) throw new AppError('INVALID_REQUEST', check.errors[0], 400, false, check.errors);

  const warnings = [...check.warnings];
  if (!a.setup_reliable) warnings.push('Setup ditandai tidak andal (level tidak sesuai harga live).');
  if (aiDir && aiDir !== direction) warnings.push('Arah trade berlawanan dengan bias analisa AI.');
  if (warnings.length && !input.acknowledgeRisk)
    throw new AppError('RISK_CHECK_FAILED', 'Ada peringatan risiko. Konfirmasi bahwa Anda menerimanya untuk melanjutkan.', 422, false, { warnings, requiresAcknowledge: true });

  const row = must(await sb.from('trade_journal').insert({
    user_id: user.id, analysis_id: a.id, direction, entry_price: entry, stop_loss: stopLoss, take_profit: takeProfit,
    planned_rr: check.rr, risk_acknowledged: warnings.length > 0, notes: input.notes,
  }).select('id,direction,entry_price,stop_loss,take_profit,planned_rr,status,created_at').single(), 'journal.insert');
  must(await sb.from('analyses').update({ saved: true, saved_at: new Date().toISOString() }).eq('id', a.id).eq('saved', false).select('id'), 'journal.mark_saved'); // cegah draft ini dibersihkan cron
  await logAudit({ userId: user.id, action: 'journal.created', entity: row.id, requestId, ip, meta: { analysisId: a.id, direction, rr: check.rr, warnings } });
  return { data: row, status: 201 };
});
