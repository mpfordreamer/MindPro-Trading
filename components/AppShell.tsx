'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ToastProvider } from './Toast';

const NAV = [
  { href: '/', label: 'Analisa' },
  { href: '/journal', label: 'Jurnal' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/settings/notifications', label: 'Notifikasi' },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? '/';
  const bare = path.startsWith('/login') || path.startsWith('/auth');
  return (
    <ToastProvider>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-emerald-500 focus:px-3 focus:py-2 focus:font-medium focus:text-slate-950">Lompat ke konten utama</a>
      {!bare && (
        <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <nav aria-label="Navigasi utama" className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto p-2">
            <span className="mr-2 shrink-0 px-2 text-sm font-semibold text-emerald-300">MarketMind</span>
            {NAV.map((n) => {
              const current = n.href === '/' ? path === '/' : path.startsWith(n.href);
              return <Link key={n.href} href={n.href} aria-current={current ? 'page' : undefined} className={`shrink-0 rounded-lg px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 ${current ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}>{n.label}</Link>;
            })}
          </nav>
        </header>
      )}
      <div id="main-content" tabIndex={-1} className="outline-none">{children}</div>
      {!bare && <footer className="mx-auto max-w-5xl p-4 text-xs text-slate-400">Bukan nasihat keuangan. Gunakan manajemen risiko.</footer>}
    </ToastProvider>
  );
}
