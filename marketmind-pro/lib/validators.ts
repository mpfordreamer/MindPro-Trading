import { z } from 'zod';
import { AGENT_IDS } from './agents';

export const TIMEFRAMES = ['15M', '1H', '4H', '1D', '1W'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
export const TF_RANK: Record<Timeframe, number> = { '15M': 0, '1H': 1, '4H': 2, '1D': 3, '1W': 4 };
export const MARKET_TYPES = ['Crypto', 'Forex', 'Stocks', 'Commodities / Gold', 'Indices'] as const;
export const MAX_CHARTS = 3;

/** Gambar diunggah browser → Supabase Storage (bucket "charts"); API hanya menerima path-nya: <userId>/<uuid>.<ext> */
export const ChartRefSchema = z.object({
  timeframe: z.enum(TIMEFRAMES),
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/, 'Path gambar tidak valid'),
});

export const AnalyzeRequestSchema = z
  .object({
    asset: z.string().trim().min(2).max(24).regex(/^[A-Za-z0-9/._:-]+$/, 'Format aset tidak valid'),
    timeframe: z.enum(TIMEFRAMES), // timeframe eksekusi (dipakai untuk data live & ATR)
    marketType: z.enum(MARKET_TYPES),
    userNotes: z.string().trim().max(2000).default(''),
    fundamentalContext: z.string().trim().max(2000).default(''),
    charts: z.array(ChartRefSchema).max(MAX_CHARTS).default([]),
  })
  .superRefine((r, ctx) => {
    if (new Set(r.charts.map((c) => c.timeframe)).size !== r.charts.length)
      ctx.addIssue({ code: 'custom', message: 'Setiap timeframe hanya boleh satu gambar', path: ['charts'] });
  });
export type AnalyzeInput = z.input<typeof AnalyzeRequestSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

const Bias = z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']);
const Price = z.number().positive().nullable();
const AgentId = z.enum(AGENT_IDS);

export const AgentEvaluationSchema = z.object({
  id: AgentId,
  bias: Bias,
  conviction: z.number().int().min(0).max(100),
  argument: z.string().min(20).max(500),
  evidence: z.array(z.string().max(200)).max(3),
  highlightedKey: z.string().min(2).max(80),
});

export const TradeSetupSchema = z
  .object({
    bias: Bias,
    entryLow: Price,
    entryHigh: Price,
    stopLoss: Price,
    takeProfit1: Price,
    takeProfit2: Price,
    keyLevels: z.array(z.object({ label: z.string().max(60), price: Price })).max(8),
    insufficientDataReason: z.string().max(300).nullable(),
  })
  .superRefine((t, ctx) => {
    const { entryLow: lo, entryHigh: hi, stopLoss: sl, takeProfit1: tp1, takeProfit2: tp2 } = t;
    if (t.bias === 'NEUTRAL' || [lo, hi, sl, tp1].some((v) => v === null)) return;
    if (lo! > hi!) ctx.addIssue({ code: 'custom', message: 'entryLow > entryHigh', path: ['entryLow'] });
    if (t.bias === 'BULLISH') {
      if (!(sl! < lo!)) ctx.addIssue({ code: 'custom', message: 'BULLISH: SL harus di bawah entry', path: ['stopLoss'] });
      if (!(tp1! > hi!)) ctx.addIssue({ code: 'custom', message: 'BULLISH: TP1 harus di atas entry', path: ['takeProfit1'] });
      if (tp2 !== null && !(tp2 > tp1!)) ctx.addIssue({ code: 'custom', message: 'TP2 harus di atas TP1', path: ['takeProfit2'] });
    } else {
      if (!(sl! > hi!)) ctx.addIssue({ code: 'custom', message: 'BEARISH: SL harus di atas entry', path: ['stopLoss'] });
      if (!(tp1! < lo!)) ctx.addIssue({ code: 'custom', message: 'BEARISH: TP1 harus di bawah entry', path: ['takeProfit1'] });
      if (tp2 !== null && !(tp2 < tp1!)) ctx.addIssue({ code: 'custom', message: 'TP2 harus di bawah TP1', path: ['takeProfit2'] });
    }
  });

const Tf = z.enum(TIMEFRAMES);
const ZoneSchema = z
  .object({
    type: z.enum(['ORDER_BLOCK_BULL', 'ORDER_BLOCK_BEAR', 'FVG', 'SUPPORT', 'RESISTANCE', 'LIQUIDITY']),
    low: Price,
    high: Price,
    note: z.string().max(160),
  })
  .refine((z) => z.low === null || z.high === null || z.low <= z.high, { message: 'zone low > high' });

export const ChartReadingSchema = z.object({ timeframe: Tf, visibleLow: Price, visibleHigh: Price, lastVisiblePrice: Price });
export const TimeframeAnalysisSchema = z.object({
  timeframe: Tf,
  trend: z.enum(['BULLISH', 'BEARISH', 'RANGING']),
  summary: z.string().max(400),
  zones: z.array(ZoneSchema).max(5),
});
export const TopDownSchema = z.object({
  alignment: z.enum(['ALIGNED', 'MIXED', 'CONFLICTING', 'NOT_AVAILABLE']),
  primaryTrend: z.string().max(300),
  entryTrigger: z.string().max(400),
});

export const AiAnalysisSchema = z
  .object({
    overallDecision: z.enum(['STRONG BUY', 'BUY', 'NEUTRAL/HOLD', 'SELL', 'STRONG SELL']),
    confidenceScore: z.number().int().min(0).max(100),
    tradeSetup: TradeSetupSchema,
    technicalAnalysis: z.object({
      summary: z.string().max(800),
      patternsDetected: z.array(z.string().max(120)).max(8),
      indicatorStatus: z.string().max(500),
      marketStructure: z.string().max(300),
    }),
    fundamentalAnalysis: z.object({
      summary: z.string().max(800),
      macroDrivers: z.array(z.string().max(160)).max(6),
      riskFactors: z.array(z.string().max(160)).max(6),
      sentimentRating: z.string().max(80),
    }),
    debate: z.object({
      summary: z.string().max(1000),
      clashes: z
        .array(
          z.object({
            agentA: AgentId,
            agentB: AgentId,
            topic: z.string().max(120),
            argumentA: z.string().max(400),
            rebuttalB: z.string().max(400),
            resolution: z.string().max(300),
          }),
        )
        .min(2)
        .max(5),
    }),
    chartReadings: z.array(ChartReadingSchema).max(MAX_CHARTS),
    timeframeAnalysis: z.array(TimeframeAnalysisSchema).max(MAX_CHARTS),
    topDown: TopDownSchema,
    dataQualityNotes: z.array(z.string().max(200)).max(6),
    agentEvaluations: z.array(AgentEvaluationSchema).length(AGENT_IDS.length),
  })
  .superRefine((d, ctx) => {
    const seen = new Set(d.agentEvaluations.map((a) => a.id));
    if (seen.size !== AGENT_IDS.length)
      ctx.addIssue({ code: 'custom', message: 'agentEvaluations harus memuat 25 agent unik', path: ['agentEvaluations'] });
  });
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(['user', 'council']), text: z.string().max(1500) })).max(10).default([]),
  context: z.object({
    asset: z.string().max(24),
    timeframe: z.enum(TIMEFRAMES),
    overallDecision: z.string().max(20),
    confidenceScore: z.number().min(0).max(100),
    technicalSummary: z.string().max(800),
    fundamentalSummary: z.string().max(800),
    debateSummary: z.string().max(1000),
    agents: z.array(z.object({ id: AgentId, bias: Bias, conviction: z.number(), argument: z.string().max(500) })).max(25),
  }),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ---- Fase 3: jurnal & riwayat ----
export const AnalysisPatchSchema = z.object({ saved: z.boolean() });
export const JournalCreateSchema = z.object({
  analysisId: z.string().uuid(),
  direction: z.enum(['LONG', 'SHORT']).optional(), // default dari bias analisa
  entryPrice: z.number().positive().optional(),    // default: batas konservatif zona entry
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),    // default: TP1
  notes: z.string().trim().max(1000).default(''),
  acknowledgeRisk: z.boolean().default(false),     // wajib true bila ada peringatan risiko
});
export type JournalCreate = z.infer<typeof JournalCreateSchema>;
export const OutcomeSchema = z.object({
  result: z.enum(['win', 'loss', 'breakeven']),
  exitPrice: z.number().positive().optional(),
  notes: z.string().trim().max(1000).default(''),
});
export const IdSchema = z.string().uuid();

// ---- Fase 4: notifikasi ----
export const ShareSchema = z.object({ analysisId: z.string().uuid(), note: z.string().trim().max(280).default('') });
export const DiscordWebhookSchema = z.object({ webhookUrl: z.string().max(300).nullable() });
export const NotificationPrefsSchema = z.object({ alertsEnabled: z.boolean() });
export const TestChannelSchema = z.object({ channel: z.enum(['telegram', 'discord']) });
export const TelegramUpdateSchema = z.object({
  message: z.object({ text: z.string().max(200).optional(), chat: z.object({ id: z.number().int(), type: z.string() }) }).optional(),
});
