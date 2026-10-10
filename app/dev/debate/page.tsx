import { notFound } from 'next/navigation';
import { DebateArenaLazy } from '@/components/lazy';
import { fixtureResult } from '@/tests/fixtures/analysis';

// Harness E2E: data fixture deterministik, tanpa memanggil Gemini. Mati di produksi kecuali ENABLE_E2E_HARNESS=1 (hanya untuk CI).
export const metadata = { title: 'Harness Debate Arena' };
export default function DebateHarness() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_E2E_HARNESS !== '1') notFound();
  return <main className="mx-auto max-w-5xl p-4"><DebateArenaLazy result={fixtureResult} /></main>;
}
