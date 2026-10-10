import type { AiAnalysis } from '@/lib/validators';
import type { Consensus, RiskReward } from '@/lib/tradeMath';
import type { LevelCheck } from '@/lib/priceValidation';
import type { MarketContext } from '@/lib/marketData';

export type AnalysisResult = AiAnalysis & {
  asset: string;
  timeframe: string;
  marketType: string;
  consensus: Consensus;
  riskReward: RiskReward;
  warnings: string[];
  marketData: MarketContext | null;
  levelChecks: LevelCheck[];
  /** false bila entry/SL tidak masuk akal terhadap harga live — UI sebaiknya menonaktifkan "Simpan ke jurnal". */
  setupReliable: boolean;
  /** id draft di database; null bila gagal disimpan. */
  analysisId: string | null;
  meta: { requestId: string; model: string; promptVersion: string; createdAt: string };
};
