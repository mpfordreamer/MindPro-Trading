import { apiRoute } from '@/lib/api';
import { must } from '@/lib/http';

export const runtime = 'nodejs';

/** Riwayat alert yang sudah terkirim (50 terbaru). */
export const GET = apiRoute(async ({ sb }) => {
  const rows = must(await sb.from('alerts').select('id,journal_id,asset,kind,trigger_price,channel,triggered_at').eq('status', 'triggered').order('triggered_at', { ascending: false }).limit(50), 'alerts.list');
  return { data: { items: rows } };
});
