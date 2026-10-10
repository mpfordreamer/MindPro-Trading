export type ErrorCode =
  | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'INVALID_REQUEST' | 'PAYLOAD_TOO_LARGE'
  | 'AI_UNAVAILABLE' | 'AI_TIMEOUT' | 'AI_BLOCKED' | 'AI_TRUNCATED'
  | 'AI_INVALID_RESPONSE' | 'MARKET_DATA_UNAVAILABLE' | 'NOT_FOUND' | 'CONFLICT' | 'RISK_CHECK_FAILED' | 'DELIVERY_FAILED' | 'CONFIG_ERROR' | 'INTERNAL';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public retryable: boolean,
    public details?: unknown,
    public retryAfterSec?: number,
  ) {
    super(message);
  }
}

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; retryable: boolean; requestId: string; details?: unknown };
}

export function errorResponse(err: unknown, requestId: string): Response {
  const e = err instanceof AppError
    ? err
    : new AppError('INTERNAL', 'Terjadi kesalahan internal. Silakan coba lagi.', 500, true);
  if (!(err instanceof AppError)) console.error(`[${requestId}] unhandled`, err);
  const headers: Record<string, string> = { 'x-request-id': requestId };
  if (e.retryAfterSec) headers['retry-after'] = String(e.retryAfterSec);
  const body: ApiErrorBody = {
    error: { code: e.code, message: e.message, retryable: e.retryable, requestId, details: e.details },
  };
  return Response.json(body, { status: e.status, headers });
}
