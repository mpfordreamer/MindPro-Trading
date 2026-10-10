import { callGemini } from '@/lib/gemini';
import { CHAT_SYSTEM_PROMPT, buildChatUserText } from '@/lib/prompts';
import { ChatRequestSchema } from '@/lib/validators';
import { AppError, errorResponse } from '@/lib/errors';
import { clientIp, enforceRateLimit } from '@/lib/rateLimit';
import { logUsage } from '@/lib/audit';
import { parseBody, requireUser } from '@/lib/http';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  let userId: string | null = null;
  try {
    const user = await requireUser();
    userId = user.id;
    await enforceRateLimit('chat', user.id, clientIp(req));
    const input = await parseBody(req, ChatRequestSchema, 200_000);
    const g = await callGemini({ system: CHAT_SYSTEM_PROMPT, parts: [{ text: buildChatUserText(input) }], temperature: 0.4, maxOutputTokens: 1500, timeoutMs: 25_000 });
    await logUsage({ userId: user.id, endpoint: 'chat', model: g.model, inputTokens: g.inputTokens, outputTokens: g.outputTokens, latencyMs: g.latencyMs, status: 'ok', requestId });
    return Response.json({ data: { reply: g.text.trim(), requestId } }, { headers: { 'x-request-id': requestId } });
  } catch (err) {
    if (userId) await logUsage({ userId, endpoint: 'chat', status: 'error', errorCode: err instanceof AppError ? err.code : 'INTERNAL', requestId });
    return errorResponse(err, requestId);
  }
}
