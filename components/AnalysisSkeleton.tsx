import { Skeleton } from './Skeleton';

/** Tampil selama analisa berjalan (10–40 dtk). role=status agar pembaca layar tahu sedang memuat. */
export function AnalysisSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Dewan 25 agent sedang menganalisis chart. Mohon tunggu.</span>
      <p aria-hidden className="text-sm text-slate-400">Dewan 25 agent sedang menganalisis… biasanya 10–40 detik.</p>
      <Skeleton className="h-28" />
      <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      <DebateSkeleton />
    </div>
  );
}

export function DebateSkeleton() {
  return (
    <div role="status" aria-label="Memuat Debate Arena" className="space-y-3">
      <Skeleton className="h-12" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>
    </div>
  );
}

export const ChartSkeleton = () => <Skeleton role="status" aria-label="Memuat chart" className="h-[360px] w-full" />;
