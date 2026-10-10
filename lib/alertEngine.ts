// Logika alert murni: kapan trade terbuka dianggap "mendekati" atau "mencapai" SL/TP.
export type AlertKind = 'sl_near' | 'sl_hit' | 'tp_near' | 'tp_hit';
export const NEAR_PROGRESS = 0.8; // ≥80% jarak entry→level sudah ditempuh
const EPS = 1e-9; // galat floating-point: (98.4-100)/(98-100) = 0.79999…, bukan 0.8

export interface OpenTrade { direction: 'LONG' | 'SHORT'; entry: number; stopLoss: number; takeProfit: number }
export interface PriceWindow { last: number; high: number; low: number }
export interface CandleLike { time: number; high: number; low: number; close: number }

/** Kemajuan harga menuju level (0 = di entry, 1 = di level). Pembagian bertanda → berlaku untuk LONG & SHORT. */
export const progress = (level: number, entry: number, price: number) => (level === entry ? 0 : (price - entry) / (level - entry));

/**
 * Jendela harga SESUDAH trade dicatat (candle dengan waktu buka >= since). Memakai high/low agar sentuhan singkat
 * di antara dua eksekusi cron tidak terlewat. Tanpa candle baru: hanya harga terakhir.
 */
export function windowSince(candles: CandleLike[], sinceSec: number): PriceWindow | null {
  if (!candles.length) return null;
  const last = candles[candles.length - 1].close;
  const after = candles.filter((c) => c.time >= sinceSec);
  return after.length ? { last, high: Math.max(...after.map((c) => c.high)), low: Math.min(...after.map((c) => c.low)) } : { last, high: last, low: last };
}

export function evaluateTrade(t: OpenTrade, w: PriceWindow): AlertKind[] {
  const long = t.direction === 'LONG';
  const toTp = long ? w.high : w.low; // ekstrem terjauh menuju TP
  const toSl = long ? w.low : w.high; // ekstrem terjauh menuju SL
  const out: AlertKind[] = [];
  if (progress(t.takeProfit, t.entry, toTp) >= 1 - EPS) out.push('tp_hit');
  else if (progress(t.takeProfit, t.entry, w.last) >= NEAR_PROGRESS - EPS) out.push('tp_near');
  if (progress(t.stopLoss, t.entry, toSl) >= 1 - EPS) out.push('sl_hit');
  else if (progress(t.stopLoss, t.entry, w.last) >= NEAR_PROGRESS - EPS) out.push('sl_near');
  return out;
}
