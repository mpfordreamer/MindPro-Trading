'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const DiscordModal = dynamic(() => import('./DiscordModal'), { ssr: false }); // tidak masuk bundle awal

export function ShareButton({ analysisId }: { analysisId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!analysisId} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-emerald-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400">↗ Bagikan</button>
      {open && analysisId && <DiscordModal analysisId={analysisId} onClose={() => setOpen(false)} />}
    </>
  );
}
