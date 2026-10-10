'use client';
import { useCallback, useEffect, useState } from 'react';
import { ApiClientError, apiGet } from '@/lib/apiClient';

/** GET + loading/error/reload. `url=null` menunda fetch. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    const ac = new AbortController();
    setLoading(true); setError(null);
    apiGet<T>(url, ac.signal)
      .then(setData)
      .catch((e) => { if (e.name !== 'AbortError') setError(e instanceof ApiClientError ? e : new ApiClientError('INTERNAL', 'Terjadi kesalahan.', true)); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [url, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, loading, reload };
}
