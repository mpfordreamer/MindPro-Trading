import 'server-only';
import { adminClient } from './supabase/admin';
import { PROMPT_VERSION } from './prompts';

export async function logAudit(e: { userId: string | null; action: string; entity?: string; requestId: string; ip: string; meta?: Record<string, unknown> }) {
  try {
    await adminClient().from('audit_logs').insert({
      user_id: e.userId, action: e.action, entity: e.entity ?? null, request_id: e.requestId, ip: e.ip,
      meta: { promptVersion: PROMPT_VERSION, ...e.meta },
    });
  } catch (err) { console.error(`[${e.requestId}] audit gagal`, err); } // audit tidak boleh menjatuhkan request
}

export async function logUsage(u: { userId: string; endpoint: string; model?: string; inputTokens?: number; outputTokens?: number; latencyMs?: number; status: 'ok' | 'error'; errorCode?: string; requestId: string }) {
  try {
    await adminClient().from('api_usage').insert({
      user_id: u.userId, endpoint: u.endpoint, model: u.model ?? null, input_tokens: u.inputTokens ?? 0, output_tokens: u.outputTokens ?? 0,
      latency_ms: u.latencyMs ?? null, status: u.status, error_code: u.errorCode ?? null, prompt_version: PROMPT_VERSION, request_id: u.requestId,
    });
  } catch (err) { console.error(`[${u.requestId}] usage gagal`, err); }
}
