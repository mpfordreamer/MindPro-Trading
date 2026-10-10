'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }
interface ToastApi { toast: (kind: ToastKind, message: string) => void }

const MAX_VISIBLE = 3;
const DURATION: Record<ToastKind, number> = { success: 4000, info: 5000, error: 8000 };
const noop: ToastApi = { toast: () => {} };
const Ctx = createContext<ToastApi>(noop);

/** Aman dipakai di luar provider (no-op), sehingga komponen tidak crash di test/halaman tanpa shell. */
export const useToast = () => useContext(Ctx);

const STYLE: Record<ToastKind, string> = {
  success: 'border-emerald-500/50 bg-emerald-950 text-emerald-100',
  error: 'border-red-500/50 bg-red-950 text-red-100',
  info: 'border-slate-600 bg-slate-900 text-slate-100',
};
const ICON: Record<ToastKind, string> = { success: '✓', error: '!', info: 'i' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setItems((l) => l.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = ++seq.current;
    setItems((l) => [...l, { id, kind, message }].slice(-MAX_VISIBLE));
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION[kind]));
  }, [dismiss]);

  useEffect(() => { const m = timers.current; return () => { m.forEach(clearTimeout); m.clear(); }; }, []);
  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {/* Region selalu ada di DOM agar pembaca layar mengumumkan isi yang masuk. Error memakai role=alert (assertive). */}
      <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        {items.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-3 text-sm shadow-lg ${STYLE[t.kind]}`}>
            <span aria-hidden className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">{ICON[t.kind]}</span>
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi" className="-m-1 rounded p-1 text-slate-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">✕</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
