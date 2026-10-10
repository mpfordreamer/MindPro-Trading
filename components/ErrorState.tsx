'use client';
import type { ApiClientError } from '@/lib/apiClient';

export function ErrorState({ error, onRetry, retrying }: { error: Pick<ApiClientError, 'message' | 'code' | 'retryable' | 'requestId'>; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
      <p className="font-semibold">Analisa gagal</p>
      <p className="mt-1">{error.message}</p>
      <p className="mt-1 text-xs text-red-300/70">Kode: {error.code}{error.requestId ? ` • ID: ${error.requestId}` : ''}</p>
      {error.retryable && onRetry && (
        <button onClick={onRetry} disabled={retrying} className="mt-3 rounded-lg bg-red-500 px-3 py-1.5 font-medium text-white hover:bg-red-400 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          {retrying ? 'Mencoba…' : 'Coba Lagi'}
        </button>
      )}
    </div>
  );
}
