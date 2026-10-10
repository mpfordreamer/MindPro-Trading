import type { Direction, JournalStats, Result } from '@/lib/journalMath';
export type { Direction, JournalStats, Result };

export interface JournalEntry {
  id: string;
  analysis_id: string;
  direction: Direction;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  planned_rr: number;
  notes: string;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
  analysis: { asset: string; timeframe: string; decision: string; confidence: number } | null;
  outcome: { result: Result; exit_price: number | null; r_multiple: number; closed_at: string; notes: string } | null;
}
export interface JournalResponse { entries: JournalEntry[]; stats: JournalStats }
