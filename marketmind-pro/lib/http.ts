import 'server-only';
import type { ZodType } from 'zod';
import { AppError } from './errors';
import { createClient } from './supabase/server';

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AppError('UNAUTHORIZED', 'Silakan login terlebih dahulu.', 401, false);
  return user;
}

export async function parseBody<T>(req: Request, schema: ZodType<T>, maxBytes = 4_400_000): Promise<T> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > maxBytes) throw new AppError('PAYLOAD_TOO_LARGE', 'Ukuran permintaan terlalu besar (maks ~4MB).', 413, false);
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new AppError('INVALID_REQUEST', 'Body bukan JSON valid.', 400, false); }
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new AppError('INVALID_REQUEST', 'Input tidak valid.', 400, false, r.error.issues.slice(0, 8).map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  return r.data;
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const r = schema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!r.success) throw new AppError('INVALID_REQUEST', 'Parameter tidak valid.', 400, false, r.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}

/** Supabase mengembalikan {data,error}; ubah error DB menjadi AppError tanpa membocorkan detail ke klien. */
export function must<T>(res: { data: T | null; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) {
    console.error(`[db] ${what}`, res.error);
    throw new AppError('INTERNAL', 'Terjadi kesalahan database. Coba lagi.', 500, true);
  }
  return res.data as T;
}

/** Relasi to-one dari PostgREST bisa berupa objek atau array — normalkan. */
export const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
