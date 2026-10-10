import { callGemini, type Part } from '@/lib/gemini';
import { loadChartImages } from '@/lib/charts';
import { loadMarketContext } from '@/lib/marketData';
import { checkLevels, isSetupReliable, levelWarnings } from '@/lib/priceValidation';
import { ANALYSIS_RESPONSE_SCHEMA } from '@/lib/geminiSchema';
import { ANALYZE_SYSTEM_PROMPT, PROMPT_VERSION, buildAnalyzeUserText } from '@/lib/prompts';
import { AiAnalysisSchema, AnalyzeRequestSchema } from '@/lib/validators';
import { buildTopDownWarnings, buildWarnings, computeConsensus, computeRiskReward } from '@/lib/tradeMath';
import { AppError, errorResponse } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/lib/rateLimit';
import { logAudit, logUsage } from '@/lib/audit';
import { parseBody, requireUser } from '@/lib/http';
import { persistAnalysis } from '@/lib/persist';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_BODY = 50_000; // gambar tidak lagi lewat body; hanya path Storage

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const ip = clientIp(req);
  let userId: string | null = null;
  try {
    const user = await requireUser();
    userId = user.id;
    await enforceRateLimit('analyze', user.id, ip);
    const input = await parseBody(req, AnalyzeRequestSchema, MAX_BODY);

    // Gambar (Storage) dan data harga live diambil paralel. Data live yang gagal = peringatan, bukan error.
    const [images, market] = await Promise.all([loadChartImages(user.id, input.charts), loadMarketContext(input)]);
    const chartTfs = images.map((i) => i.timeframe);

    const parts: Part[] = [
      { text: buildAnalyzeUserText(input, chartTfs, market.context, market.reason) },
      ...images.flatMap((i): Part[] => [{ text: `Gambar chart timeframe ${i.timeframe}:` }, { inlineData: { mimeType: i.mimeType, data: i.data } }]),
    ];
    const g = await callGemini({ system: ANALYZE_SYSTEM_PROMPT, parts, temperature: 0.3, maxOutputTokens: 16_000, responseSchema: ANALYSIS_RESPONSE_SCHEMA });

    let parsed: unknown;
    try { parsed = JSON.parse(g.text); } catch { throw new AppError('AI_INVALID_RESPONSE', 'AI mengembalikan format yang tidak valid. Coba lagi.', 502, true); }
    const v = AiAnalysisSchema.safeParse(parsed);
    if (!v.success) {
      console.error(`[${requestId}] zod`, v.error.issues.slice(0, 10));
      throw new AppError('AI_INVALID_RESPONSE', 'Hasil AI tidak lolos validasi. Coba lagi.', 502, true, v.error.issues.slice(0, 5).map((i) => ({ path: i.path.join('.'), message: i.message })));
    }

    const ai = v.data;
    const consensus = computeConsensus(ai.agentEvaluations); // dihitung server, bukan dipercaya dari AI
    const riskReward = computeRiskReward(ai.tradeSetup);
    // Bandingkan level AI & bacaan chart vs harga live
    const live = market.context?.summary;
    const t = ai.tradeSetup;
    const levelChecks = live
      ? checkLevels(
          [
            { label: 'Entry (batas bawah)', price: t.entryLow, kind: 'entry' },
            { label: 'Entry (batas atas)', price: t.entryHigh, kind: 'entry' },
            { label: 'Stop loss', price: t.stopLoss, kind: 'stop' },
            ...ai.chartReadings.map((c) => ({ label: `Harga terakhir di chart ${c.timeframe}`, price: c.lastVisiblePrice, kind: 'chart' as const })),
          ],
          live.livePrice,
          live.atr14,
        )
      : [];
    const warnings = [
      ...buildWarnings(ai, consensus, riskReward, images.length > 0),
      ...buildTopDownWarnings(ai, chartTfs),
      ...(market.context?.stale ? ['Data harga live berasal dari cache lama (penyedia data sedang bermasalah); harga mungkin tertinggal.'] : []),
      ...(live ? levelWarnings(levelChecks, live.livePrice) : [`Data harga live tidak tersedia (${market.reason}). Level tidak dapat divalidasi terhadap pasar.`]),
    ];

    const data = {
      ...ai, asset: input.asset, timeframe: input.timeframe, marketType: input.marketType, consensus, riskReward, warnings,
      marketData: market.context, levelChecks, setupReliable: isSetupReliable(levelChecks),
      meta: { requestId, model: g.model, promptVersion: PROMPT_VERSION, createdAt: new Date().toISOString() },
    };

    // Setiap analisa tersimpan otomatis sebagai draft (audit + bisa dibuka ulang). "Simpan" hanya menandai saved=true;
    // draft yang tidak disimpan dibersihkan cron setelah 7 hari. Gagal menyimpan TIDAK menggagalkan analisa.
    const analysisId = await persistAnalysis(await createClient(), {
      userId: user.id, requestId, asset: input.asset, timeframe: input.timeframe, marketType: input.marketType, ai, consensus,
      rr1: riskReward.rr1, livePrice: live?.livePrice ?? null, setupReliable: data.setupReliable, warnings,
      chartPaths: input.charts.map((c) => c.path), model: g.model, promptVersion: PROMPT_VERSION, result: data,
    });

    await Promise.all([
      logUsage({ userId: user.id, endpoint: 'analyze', model: g.model, inputTokens: g.inputTokens, outputTokens: g.outputTokens, latencyMs: g.latencyMs, status: 'ok', requestId }),
      logAudit({ userId: user.id, action: 'analysis.created', entity: analysisId ?? input.asset, requestId, ip, meta: { timeframe: input.timeframe, decision: ai.overallDecision, charts: chartTfs.length, liveData: !!live, persisted: !!analysisId } }),
    ]);

    return Response.json(
      { data: { ...data, analysisId, warnings: analysisId ? warnings : [...warnings, 'Analisa tidak dapat disimpan ke riwayat (kesalahan database). Hasil ini hanya tampil sekali.'] } },
      { headers: { 'x-request-id': requestId } },
    );
  } catch (err) {
    if (userId) await logUsage({ userId, endpoint: 'analyze', status: 'error', errorCode: err instanceof AppError ? err.code : 'INTERNAL', requestId });
    return errorResponse(err, requestId);
  }
}
