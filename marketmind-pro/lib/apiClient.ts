export class ApiClientError extends Error {
  constructor(public code: string, message: string, public retryable: boolean, public requestId?: string, public details?: unknown) {
    super(message);
  }
}

export async function apiRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method, signal, ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiClientError('NETWORK', 'Koneksi terputus. Periksa internet Anda.', true);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
    const e = json?.error;
    throw new ApiClientError(e?.code ?? 'INTERNAL', e?.message ?? 'Terjadi kesalahan.', e?.retryable ?? res.status >= 500, e?.requestId, e?.details);
  }
  return json.data as T;
}

export const apiGet = <T,>(url: string, signal?: AbortSignal) => apiRequest<T>('GET', url, undefined, signal);
export const apiPost = <T,>(url: string, body: unknown, signal?: AbortSignal) => apiRequest<T>('POST', url, body, signal);
export const apiPatch = <T,>(url: string, body: unknown) => apiRequest<T>('PATCH', url, body);
export const apiDelete = <T,>(url: string) => apiRequest<T>('DELETE', url);
