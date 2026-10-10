import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

/** Service role: bypass RLS. Hanya untuk audit_logs & api_usage di server. */
export function adminClient() {
  const e = env();
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
