import TradingJournal from '@/components/TradingJournal';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata = { title: 'Jurnal Trading — MarketMind AI' };
export default function JournalPage() {
  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="mb-4 text-2xl font-semibold">Jurnal Trading</h1>
      <ErrorBoundary fallbackTitle="Jurnal gagal dimuat"><TradingJournal /></ErrorBoundary>
    </main>
  );
}
