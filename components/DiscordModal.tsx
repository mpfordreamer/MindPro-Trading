'use client';
import { useState } from 'react';
import { ApiClientError, apiPost } from '@/lib/apiClient';

/** Dimuat lazy (next/dynamic). Berbagi ke Discord ATAU Telegram — keduanya lewat backend. */
export default function DiscordModal({ analysisId, onClose }: { analysisId: string; onClose: () => void }) {
  const [channel, setChannel] = useState<'discord' | 'telegram'>('discord');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true); setMsg(null);
    try {
      await apiPost(`/api/share/${channel}`, { analysisId, note });
      setMsg({ ok: true, text: `Terkirim ke ${channel === 'discord' ? 'Discord' : 'Telegram'}.` });
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : 'Gagal mengirim.' }); }
    finally { setBusy(false); }
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="sh-h" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-sm text-slate-100">
        <h2 id="sh-h" className="text-lg font-semibold">Bagikan analisa</h2>
        <div role="group" aria-label="Tujuan" className="flex gap-2">
          {(['discord', 'telegram'] as const).map((c) => <button key={c} onClick={() => setChannel(c)} aria-pressed={channel === c} className={`rounded-lg border px-3 py-1 ${channel === c ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600'}`}>{c === 'discord' ? 'Discord' : 'Telegram'}</button>)}
        </div>
        <label className="block">Catatan (opsional, maks 280)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} rows={3} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5" />
        </label>
        <p className="text-xs text-slate-400">Yang dikirim: keputusan, konsensus, setup, dan peringatan. Bukan nasihat keuangan.</p>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-emerald-400' : 'text-red-400'}>{msg.text}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1.5">Tutup</button>
          <button onClick={send} disabled={busy} className="rounded-lg bg-emerald-500 px-3 py-1.5 font-medium text-slate-950 disabled:opacity-50">{busy ? 'Mengirim…' : 'Kirim'}</button>
        </div>
      </div>
    </div>
  );
}
