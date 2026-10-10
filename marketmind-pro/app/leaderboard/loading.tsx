import { Skeleton } from '@/components/Skeleton';
export default function Loading() {
  return <main role="status" aria-label="Memuat leaderboard" className="mx-auto max-w-5xl space-y-2 p-4"><Skeleton className="h-8 w-56" />{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10" />)}</main>;
}
