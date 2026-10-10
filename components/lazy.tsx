'use client';
import dynamic from 'next/dynamic';
import { ChartSkeleton, DebateSkeleton } from './AnalysisSkeleton';

// Komponen berat dimuat saat dibutuhkan → bundle awal lebih kecil.
// (DiscordModal sudah lazy di ShareButton; PDF dibuat server-side sehingga tidak ada library PDF di klien.)
export const DebateArenaLazy = dynamic(() => import('./DebateArena'), { ssr: false, loading: () => <DebateSkeleton /> });
export const LiveChartLazy = dynamic(() => import('./LiveChart'), { ssr: false, loading: () => <ChartSkeleton /> });
