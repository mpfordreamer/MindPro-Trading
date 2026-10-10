'use client';
import { useCallback, useRef, useState } from 'react';
import { ApiClientError, apiPost } from '@/lib/apiClient';
import type { AnalyzeInput } from '@/lib/validators';
import type { AnalysisResult } from '@/types/analysis';

export function useAnalyze() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [loading, setLoading] = useState(false);
  const last = useRef<AnalyzeInput | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (input: AnalyzeInput) => {
    last.current = input;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setLoading(true); setError(null);
    try {
      setResult(await apiPost<AnalysisResult>('/api/analyze', input, ctrl.current.signal));
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setResult(null);
      setError(e instanceof ApiClientError ? e : new ApiClientError('INTERNAL', 'Terjadi kesalahan.', true));
    } finally { setLoading(false); }
  }, []);

  const retry = useCallback(() => { if (last.current) void run(last.current); }, [run]);
  return { result, error, loading, run, retry };
}
