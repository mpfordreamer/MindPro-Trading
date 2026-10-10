'use client';
import { ChartUploader, type ChartSlot } from './ChartUploader';
import type { Timeframe } from '@/lib/validators';

const SLOTS: { timeframe: Timeframe; label: string }[] = [
  { timeframe: '1D', label: 'Daily — tren utama' },
  { timeframe: '4H', label: '4H — struktur & zona' },
  { timeframe: '15M', label: '15M — entry presisi' },
];

export function MultiTimeframeUploader({ value, onChange, disabled }: { value: ChartSlot[]; onChange: (v: ChartSlot[]) => void; disabled?: boolean }) {
  const byTf = new Map(value.map((s) => [s.timeframe, s]));
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-sm text-slate-300">Screenshot chart (opsional, maks 3 — makin lengkap makin akurat)</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {SLOTS.map((s) => (
          <ChartUploader
            key={s.timeframe}
            {...s}
            value={byTf.get(s.timeframe) ?? null}
            disabled={disabled}
            onChange={(slot) => onChange(slot ? [...value.filter((v) => v.timeframe !== s.timeframe), slot] : value.filter((v) => v.timeframe !== s.timeframe))}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Ubah slot → payload untuk /api/analyze. */
export const toChartRefs = (slots: ChartSlot[]) => slots.map(({ timeframe, path }) => ({ timeframe, path }));
