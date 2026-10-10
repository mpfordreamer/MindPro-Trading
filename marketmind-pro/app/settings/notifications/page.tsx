import dynamic from 'next/dynamic';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Skeleton } from '@/components/Skeleton';

const TelegramSettings = dynamic(() => import('@/components/TelegramSettings'), { loading: () => <Skeleton className="h-40" /> });
export const metadata = { title: 'Notifikasi — MarketMind AI' };

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-2xl p-4 text-slate-100">
      <h1 className="mb-4 text-2xl font-semibold">Pengaturan Notifikasi</h1>
      <ErrorBoundary fallbackTitle="Pengaturan gagal dimuat"><TelegramSettings /></ErrorBoundary>
    </main>
  );
}
