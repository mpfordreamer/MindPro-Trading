import type { AlertKind } from './alertEngine';

export const DISCLAIMER = 'Bukan nasihat keuangan. Gunakan manajemen risiko.';
export interface AlertCtx { asset: string; timeframe: string; direction: 'LONG' | 'SHORT'; entry: number; stopLoss: number; takeProfit: number; price: number; bothHit?: boolean }

const TITLES: Record<AlertKind, string> = {
  tp_near: 'Mendekati Take Profit', tp_hit: 'Take Profit tersentuh', sl_near: 'Mendekati Stop Loss', sl_hit: 'Stop Loss tersentuh',
};

export function alertMessage(kind: AlertKind, c: AlertCtx): { title: string; body: string } {
  const level = kind.startsWith('tp') ? c.takeProfit : c.stopLoss;
  const lines = [
    `${c.asset} ${c.timeframe} · ${c.direction}`,
    `Harga terakhir: ${c.price} | ${kind.startsWith('tp') ? 'TP' : 'SL'}: ${level} | Entry: ${c.entry}`,
  ];
  if (kind.endsWith('_hit')) lines.push('Konfirmasi hasilnya di Jurnal Trading (Win/Loss/Breakeven).');
  if (c.bothHit) lines.push('Catatan: TP dan SL sama-sama tersentuh pada rentang waktu yang dipantau; urutan tidak dapat dipastikan. Periksa chart.');
  lines.push(DISCLAIMER);
  return { title: `${kind.endsWith('_hit') ? '🎯' : '⚠️'} ${TITLES[kind]} — ${c.asset}`, body: lines.join('\n') };
}
