'use client';
import type { RefObject } from 'react';

export function QuickFilter({ value, onChange, inputRef, placeholder = 'Cari agent, topik, atau argumen…' }: {
  value: string; onChange: (v: string) => void; inputRef?: RefObject<HTMLInputElement | null>; placeholder?: string;
}) {
  return (
    <div className="relative min-w-0 flex-1 basis-60">
      <label htmlFor="quick-filter" className="sr-only">Cari agent atau topik debat</label>
      <input
        id="quick-filter" ref={inputRef} type="search" value={value} autoComplete="off" spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape' && value) { e.preventDefault(); onChange(''); } }}
        placeholder={placeholder} aria-keyshortcuts="/"
        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-3 pr-10 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
      />
      <kbd aria-hidden className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-slate-700 px-1.5 text-xs text-slate-400 sm:block">/</kbd>
    </div>
  );
}
