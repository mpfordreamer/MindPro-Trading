// Format pesan berbagi (Discord embed / Telegram teks). Murni; semua string dipotong sesuai batas platform.
import { DISCLAIMER } from './alertMessages';

export interface ShareSource {
  asset: string; timeframe: string; marketType: string; overallDecision: string; confidenceScore: number;
  consensus: { bullishPct: number; bearishPct: number; neutralPct: number };
  tradeSetup: { bias: string; entryLow: number | null; entryHigh: number | null; stopLoss: number | null; takeProfit1: number | null; takeProfit2: number | null };
  riskReward: { rr1: number | null };
  warnings: string[];
  topDown?: { alignment: string };
}

export const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`);
const p = (n: number | null) => (n === null ? '—' : String(n));

export function setupLine(t: ShareSource['tradeSetup'], rr: number | null): string {
  if (t.bias === 'NEUTRAL' && t.entryLow === null) return 'Tidak ada setup (tidak cukup data / netral).';
  return `Entry ${p(t.entryLow)}–${p(t.entryHigh)} | SL ${p(t.stopLoss)} | TP1 ${p(t.takeProfit1)} | TP2 ${p(t.takeProfit2)}${rr ? ` | R:R 1:${rr}` : ''}`;
}

const COLORS: Record<string, number> = { 'STRONG BUY': 0x059669, BUY: 0x10b981, 'NEUTRAL/HOLD': 0x94a3b8, SELL: 0xef4444, 'STRONG SELL': 0xb91c1c };

export function buildAnalysisEmbed(s: ShareSource, note: string) {
  const c = s.consensus;
  return {
    username: 'MarketMind AI',
    allowed_mentions: { parse: [] as string[] }, // blokir @everyone/@role dari teks apa pun
    embeds: [{
      title: clip(`${s.asset} ${s.timeframe} — ${s.overallDecision} (${s.confidenceScore}%)`, 250),
      description: note ? clip(note, 280) : undefined,
      color: COLORS[s.overallDecision] ?? 0x64748b,
      fields: [
        { name: 'Konsensus 25 agent', value: `Bullish ${c.bullishPct}% · Bearish ${c.bearishPct}% · Netral ${c.neutralPct}%`, inline: false },
        { name: 'Trade setup', value: clip(setupLine(s.tradeSetup, s.riskReward.rr1), 1000), inline: false },
        ...(s.topDown && s.topDown.alignment !== 'NOT_AVAILABLE' ? [{ name: 'Keselarasan timeframe', value: s.topDown.alignment, inline: true }] : []),
        ...(s.warnings.length ? [{ name: 'Peringatan', value: clip(s.warnings.slice(0, 3).map((w) => `• ${w}`).join('\n'), 1000), inline: false }] : []),
      ],
      footer: { text: DISCLAIMER },
    }],
  };
}

export function buildShareText(s: ShareSource, note: string): string {
  const c = s.consensus;
  return clip([
    `${s.asset} ${s.timeframe} — ${s.overallDecision} (${s.confidenceScore}%)`,
    `Konsensus: Bullish ${c.bullishPct}% · Bearish ${c.bearishPct}% · Netral ${c.neutralPct}%`,
    setupLine(s.tradeSetup, s.riskReward.rr1),
    ...s.warnings.slice(0, 3).map((w) => `• ${w}`),
    ...(note ? [`Catatan: ${note}`] : []),
    DISCLAIMER,
  ].join('\n'), 4000);
}
