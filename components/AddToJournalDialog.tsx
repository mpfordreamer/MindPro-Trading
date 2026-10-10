'use client';
import { useMemo, useState } from 'react';
import { ApiClientError, apiPost } from '@/lib/apiClient';
import { directionFromBias, validatePlan, type Direction } from '@/lib/journalMath';
import type { AnalysisResult } from '@/types/analysis';

/** Form kecil: terisi dari setup AI, divalidasi dengan fungsi yang sama dengan server. */
export function AddToJournalDialog({ result, onDone }: { result: AnalysisResult; onDone?: () => void }) {
  const t = result.tradeSetup;
  const aiDir = directionFromBias(t.bias);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>(aiDir ?? 'LONG');
  const [entry, setEntry] = useState(String((direction === 'LONG' ? t.entryHigh : t.entryLow) ?? ''));
  const [sl, setSl] = useState(String(t.stopLoss ?? ''));
  const [tp, setTp] = useState(String(t.takeProfit1 ?? ''));
  const [notes, setNotes] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const check = useMemo(() => {
    const [e, s, p] = [Number(entry), Number(sl), Number(tp)];
    if (![e, s, p].every((n) => Number.isFinite(n) && n > 0)) return null;
    return validatePlan({ direction, entry: e, stopLoss: s, takeProfit: p });
  }, [direction, entry, sl, tp]);
  const warnings = [...(check?.warnings ?? []), ...(!result.setupReliable ? ['Setup ditandai tidak andal terhadap harga live.'] : []), ...(aiDir && aiDir !== direction ? ['Arah berlawanan dengan bias AI.'] : [])];
  const canSubmit = !!result.analysisId && check && !check.errors.length && (!warnings.length || ack) && !busy;

  async function submit() {
    setBusy(true); setErr(null);
    try {
      await apiPost('/api/journal', { analysisId: result.analysisId, direction, entryPrice: Number(entry), stopLoss: Number(sl), takeProfit: Number(tp), notes, acknowledgeRisk: ack });
      setDone(true); setOpen(false); onDone?.();
    } catch (e) { setErr(e instanceof ApiClientError ? e.message : 'Gagal menambahkan ke jurnal.'); }
    finally { setBusy(false); }
  }

  if (done) return <span role="status" className="text-sm text-emerald-400">✓ Ditambahkan ke jurnal</span>;
  const field = 'mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5';
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!result.analysisId} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">+ Tambah ke jurnal</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="jr-h" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-sm text-slate-100">
            <h2 id="jr-h" className="text-lg font-semibold">Tambah ke jurnal — {result.asset}</h2>
            <div className="grid grid-cols-2 gap-3">
              <label>Arah<select value={direction} onChange={(e) => setDirection(e.target.value as Direction)} className={field}><option>LONG</option><option>SHORT</option></select></label>
              <label>Entry<input inputMode="decimal" value={entry} onChange={(e) => setEntry(e.target.value)} className={field} /></label>
              <label>Stop loss<input inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value)} className={field} /></label>
              <label>Take profit<input inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)} className={field} /></label>
            </div>
            <label className="block">Catatan<textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} className={field} /></label>
            {check && <p className="text-slate-400">R:R rencana: <b className="text-slate-100">{check.rr ? `1:${check.rr}` : '—'}</b></p>}
            {check?.errors.map((m) => <p key={m} role="alert" className="text-red-400">{m}</p>)}
            {warnings.length > 0 && !check?.errors.length && (
              <div role="alert" className="rounded-lg bg-amber-500/10 p-2 text-amber-300">
                <ul className="list-disc pl-4">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />Saya memahami risikonya dan tetap ingin mencatat trade ini.</label>
              </div>
            )}
            {err && <p role="alert" className="text-red-400">{err}</p>}
            <p className="text-xs text-slate-400">Bukan nasihat keuangan. Gunakan manajemen risiko.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-600 px-3 py-1.5">Batal</button>
              <button onClick={submit} disabled={!canSubmit} className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-slate-950 disabled:opacity-50">{busy ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
