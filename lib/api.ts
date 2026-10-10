import 'server-only';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { AppError, errorResponse } from './errors';
import { requireUser } from './http';
import { clientIp, enforceRateLimit } from './rateLimit';
import { IdSchema } from './validators';
import { createClient } from './supabase/server';

export interface RouteArgs<C> { req: Request; ctx: C; user: User; sb: SupabaseClient; requestId: string; ip: string }
export type DynCtx = { params: Promise<{ id: string }> };

/** Pembungkus standar: auth → rate limit → handler → format {data} / error terstruktur. */
export function apiRoute<C = unknown>(fn: (a: RouteArgs<C>) => Promise<{ data: unknown; status?: number } | { response: Response }>, opts: { rateLimit?: 'journal' | 'share' | null } = {}) {
  return async (req: Request, ctx: C): Promise<Response> => {
    const requestId = crypto.randomUUID();
    try {
      const user = await requireUser();
      const ip = clientIp(req);
      const kind = opts.rateLimit === undefined ? 'journal' : opts.rateLimit;
      if (kind) await enforceRateLimit(kind, user.id, ip);
      const r = await fn({ req, ctx, user, sb: await createClient(), requestId, ip });
      if ('response' in r) return r.response;
      return Response.json({ data: r.data }, { status: r.status ?? 200, headers: { 'x-request-id': requestId } });
    } catch (e) {
      return errorResponse(e, requestId);
    }
  };
}

export async function routeId(ctx: DynCtx): Promise<string> {
  const r = IdSchema.safeParse((await ctx.params).id);
  if (!r.success) throw new AppError('INVALID_REQUEST', 'ID tidak valid.', 400, false);
  return r.data;
}
export { z };
