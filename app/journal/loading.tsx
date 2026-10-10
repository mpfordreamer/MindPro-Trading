import { Skeleton } from '@/components/Skeleton';
export default function Loading() {
  return <main role="status" aria-label="Memuat jurnal" className="mx-auto max-w-5xl space-y-3 p-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-20" /><Skeleton className="h-64" /></main>;
}
