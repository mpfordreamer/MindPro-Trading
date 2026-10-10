import { AGENTS } from '@/lib/agents';
import type { EvalLike } from '@/lib/agentFilter';

/** Fixture deterministik (bukan data acak): 25 agent, pola bias berulang. Dipakai unit test, test komponen, dan harness E2E. */
const BIAS = ['BULLISH', 'BEARISH', 'NEUTRAL', 'BULLISH', 'BULLISH'] as const;
export const fixtureEvaluations: EvalLike[] = AGENTS.map((a, i) => ({
  id: a.id,
  bias: BIAS[i % BIAS.length]!,
  conviction: 40 + ((i * 7) % 55),
  argument: `Argumen fixture untuk ${a.name}: struktur pasar dan level kunci mendukung bias ini.`,
  evidence: i % 2 === 0 ? [`Evidence ${i + 1}: candle penolakan di zona kunci`] : [],
  highlightedKey: 'Struktur pasar',
}));

export const fixtureClashes = [
  { agentA: 'ict_smart_money', agentB: 'extreme_sentiment_contrarian', topic: 'Likuiditas di atas swing high', argumentA: 'Sweep likuiditas lalu reversal.', rebuttalB: 'Sentimen belum ekstrem, belum waktunya melawan tren.', resolution: 'Tunggu konfirmasi MSS di 15M.' },
  { agentA: 'fed_policy_watcher', agentB: 'macro_hedge_fund', topic: 'Dampak rilis CPI', argumentA: 'Inflasi turun mendukung risk-on.', rebuttalB: 'Imbal hasil obligasi masih menekan.', resolution: 'Risiko event tinggi, kurangi ukuran posisi.' },
];

export const fixtureResult = {
  agentEvaluations: fixtureEvaluations as never,
  debate: { summary: 'Mayoritas agent condong bullish dengan catatan risiko makro.', clashes: fixtureClashes as never },
  consensus: { bullishPct: 60, bearishPct: 20, neutralPct: 20 },
};
