'use client';
import { useState } from 'react';
import { ApiClientError, apiPatch } from '@/lib/apiClient';
import { useToast } from './Toast';

export function SaveAnalysisButton({ analysisId, initialSaved = false }: { analysisId: string | null; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function toggle() {
    if (!analysisId) return;
    setBusy(true);
    try { await apiPatch(`/api/analyses/${analysisId}`, { saved: !saved }); setSaved(!saved); toast('success', saved ? 'Analisa dihapus dari simpanan.' : 'Analisa tersimpan.'); }
    catch (e) { toast('error', e instanceof ApiClientError ? e.message : 'Gagal menyimpan.'); }
    finally { setBusy(false); }
  }

  return (
      <button onClick={toggle} disabled={!analysisId || busy} aria-pressed={saved} title={analysisId ? undefined : 'Analisa ini tidak tersimpan di database'}
        className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-emerald-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">
        {busy ? 'Menyimpan…' : saved ? '★ Tersimpan' : '☆ Simpan analisa'}
      </button>
  );
}
