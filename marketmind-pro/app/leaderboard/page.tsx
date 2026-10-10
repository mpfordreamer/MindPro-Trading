import Leaderboard from '@/components/Leaderboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata = { title: 'Leaderboard Agent — MarketMind AI' };
export default function LeaderboardPage() {
  return (
    <main className="mx-auto max-w-5xl p-4 text-slate-100">
      <h1 className="mb-4 text-2xl font-semibold">Leaderboard 25 Agent</h1>
      <ErrorBoundary fallbackTitle="Leaderboard gagal dimuat"><Leaderboard /></ErrorBoundary>
    </main>
  );
}
