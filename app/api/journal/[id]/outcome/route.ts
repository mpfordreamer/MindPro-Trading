import { apiRoute, routeId, type DynCtx } from '@/lib/api';
import { logAudit } from '@/lib/audit';
import { AppError } from '@/lib/errors';
import { must, parseBody } from '@/lib/http';
import { computeRMultiple, outcomeConsistencyError, type Plan } from '@/lib/journalMath';
import { OutcomeSchema } from '@/lib/validators';

export const runtime = 'nodejs';

/** Konfirmasi (atau koreksi) hasil trade. Satu hasil per entri jurnal (upsert). */
export const POST = apiRoute<DynCtx>(async ({ req, ctx, sb, user, requestId, ip }) => {
  const id = await routeId(ctx);
  const input = await parseBody(req, OutcomeSchema, 5_000);
  const j = must(await sb.from('trade_journal').select('id,analysis_id,direction,entry_price,stop_loss,take_profit,planned_rr').eq('id', id).maybeSingle(), 'outcome.journal');
  if (!j) throw new AppError('NOT_FOUND', 'Entri jurnal tidak ditemukan.', 404, false);

  const plan: Plan = { direction: j.direction, entry: Number(j.entry_price), stopLoss: Number(j.stop_loss), takeProfit: Number(j.take_profit) };
  const r = computeRMultiple(plan, input.result, input.exitPrice);
  const bad = input.exitPrice !== undefined ? outcomeConsistencyError(input.result, r) : null; // tanpa exit, R diturunkan dari label sehingga pasti konsisten
  if (bad) throw new AppError('INVALID_REQUEST', bad, 400, false);

  const now = new Date().toISOString();
  const outcome = must(await sb.from('trade_outcomes').upsert({
    journal_id: j.id, user_id: user.id, analysis_id: j.analysis_id, direction: j.direction, result: input.result,
    exit_price: input.exitPrice ?? null, r_multiple: r, planned_rr: j.planned_rr, notes: input.notes, closed_at: now,
  }, { onConflict: 'journal_id' }).select('result,exit_price,r_multiple,closed_at').single(), 'outcome.upsert');
  must(await sb.from('trade_journal').update({ status: 'closed', closed_at: now }).eq('id', id).select('id'), 'outcome.close');
  await logAudit({ userId: user.id, action: 'trade.outcome', entity: id, requestId, ip, meta: { result: input.result, r } });
  return { data: outcome };
});
