import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import './globals.css';
import './phase5.css';

export const metadata: Metadata = { title: 'MarketMind AI Professional', description: 'Dewan 25 agent untuk analisa trading multi-timeframe.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, colorScheme: 'dark', themeColor: '#020617' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-dvh bg-slate-950 text-slate-100 antialiased"><AppShell>{children}</AppShell></body>
    </html>
  );
}
