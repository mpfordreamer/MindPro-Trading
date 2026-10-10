import 'server-only';
import { env } from './env';
import { AppError } from './errors';

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiResult { text: string; model: string; inputTokens: number; outputTokens: number; latencyMs: number }

interface Opts {
  system: string;
  parts: Part[];
  temperature: number;
  maxOutputTokens: number;
  responseSchema?: object;
  timeoutMs?: number;
}

export async function callGemini(o: Opts): Promise<GeminiResult> {
  const { GEMINI_API_KEY, GEMINI_MODEL } = env();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), o.timeoutMs ?? 55_000);
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY }, // key di header, bukan URL
      signal: ctrl.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: o.system }] },
        contents: [{ role: 'user', parts: o.parts }],
        generationConfig: {
          temperature: o.temperature,
          maxOutputTokens: o.maxOutputTokens,
          ...(o.responseSchema ? { responseMimeType: 'application/json', responseSchema: o.responseSchema } : {}),
        },
      }),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new AppError('AI_TIMEOUT', 'AI terlalu lama merespons. Coba lagi.', 504, true);
    throw new AppError('AI_UNAVAILABLE', 'Tidak dapat menghubungi layanan AI.', 502, true);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    console.error('Gemini HTTP', res.status, (await res.text()).slice(0, 500));
    if (res.status === 429) throw new AppError('AI_UNAVAILABLE', 'Kuota layanan AI sedang penuh. Coba beberapa saat lagi.', 503, true, undefined, 30);
    if (res.status === 401 || res.status === 403) throw new AppError('CONFIG_ERROR', 'Kredensial AI di server tidak valid.', 500, false);
    throw new AppError('AI_UNAVAILABLE', 'Layanan AI sedang bermasalah.', 502, res.status >= 500);
  }

  const json = await res.json();
  if (json.promptFeedback?.blockReason) throw new AppError('AI_BLOCKED', 'Permintaan diblokir oleh filter keamanan AI.', 422, false);
  const cand = json.candidates?.[0];
  if (cand?.finishReason === 'MAX_TOKENS') throw new AppError('AI_TRUNCATED', 'Respons AI terpotong. Coba lagi.', 502, true);
  const text: string | undefined = cand?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
  if (!text) throw new AppError('AI_INVALID_RESPONSE', 'AI tidak mengembalikan konten.', 502, true);

  return {
    text,
    model: GEMINI_MODEL,
    inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    latencyMs: Date.now() - started,
  };
}
