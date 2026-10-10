'use client';
import { useId, useState } from 'react';
import { compressChart } from '@/lib/image';
import { createClient } from '@/lib/supabase/browser';
import type { Timeframe } from '@/lib/validators';

export interface ChartSlot { timeframe: Timeframe; path: string; previewUrl: string }

interface Props {
  label: string;
  timeframe: Timeframe;
  value: ChartSlot | null;
  onChange: (slot: ChartSlot | null) => void;
  disabled?: boolean;
}

export function ChartUploader({ label, timeframe, value, onChange, disabled }: Props) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const blob = await compressChart(file);
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) throw new Error('Sesi berakhir. Silakan login ulang.');
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await sb.storage.from('charts').upload(path, blob, { contentType: 'image/jpeg' });
      if (upErr) throw new Error('Gagal mengunggah gambar. Coba lagi.');
      if (value) void sb.storage.from('charts').remove([value.path]); // bersihkan gambar lama (best-effort)
      onChange({ timeframe, path, previewUrl: URL.createObjectURL(blob) });
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  function remove() {
    if (!value) return;
    void createClient().storage.from('charts').remove([value.path]);
    URL.revokeObjectURL(value.previewUrl);
    onChange(null);
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-100">{label} <span className="text-slate-400">({timeframe})</span></span>
        {value && <button type="button" onClick={remove} disabled={disabled || busy} aria-label={`Hapus gambar ${label}`} className="text-xs text-red-400 underline disabled:opacity-50">Hapus</button>}
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value.previewUrl} alt={`Chart ${label}`} className="h-32 w-full rounded-lg object-cover" />
      ) : (
        <label htmlFor={id} className={`flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-600 text-sm text-slate-400 focus-within:outline focus-within:outline-2 focus-within:outline-emerald-400 ${disabled || busy ? 'pointer-events-none opacity-50' : 'hover:border-emerald-500'}`}>
          {busy ? 'Mengunggah…' : 'Pilih screenshot (PNG/JPG/WebP)'}
          <input id={id} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={disabled || busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
