import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildAnalysisRow, buildDebateRow, buildEvaluationRows, type AnalysisSource } from './analysisRows';
import type { AiAnalysis } from './validators';

/** Simpan hasil analisa sebagai draft (saved=false). Mengembalikan id, atau null bila gagal (analisa tetap dikirim ke user). */
export async function persistAnalysis(sb: SupabaseClient, s: AnalysisSource & { ai: AiAnalysis }): Promise<string | null> {
  const { data, error } = await sb.from('analyses').insert(buildAnalysisRow(s)).select('id').single();
  if (error || !data) { console.error(`[${s.requestId}] persist analyses`, error); return null; }
  const id = data.id as string;
  const [ev, db] = await Promise.all([
    sb.from('agent_evaluations').insert(buildEvaluationRows(id, s.userId, s.ai)),
    sb.from('debates').insert(buildDebateRow(id, s.userId, s.ai)),
  ]);
  if (ev.error || db.error) {
    console.error(`[${s.requestId}] persist children`, ev.error ?? db.error);
    await sb.from('analyses').delete().eq('id', id); // kompensasi: jangan tinggalkan analisa setengah jadi (cascade)
    return null;
  }
  return id;
}
