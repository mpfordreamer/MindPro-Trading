'use client';
import { useState } from 'react';
import { useToast } from './Toast';

export function ExportPdfButton({ analysisId }: { analysisId: string | null }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function download() {
    if (!analysisId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/export/pdf?analysisId=${analysisId}`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? 'Gagal membuat PDF.');
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') ?? '')?.[1] ?? 'MarketMind.pdf';
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast('success', 'PDF berhasil dibuat.');
    } catch (e) { toast('error', (e as Error).message || 'Gagal membuat PDF.'); }
    finally { setBusy(false); }
  }
  return (
      <button onClick={download} disabled={!analysisId || busy} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-emerald-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">{busy ? 'Membuat PDF…' : '⬇ Unduh PDF'}</button>
  );
}
