export type LevelKind = 'entry' | 'stop' | 'chart';
export type LevelStatus = 'ok' | 'far' | 'implausible';
export interface LevelInput { label: string; price: number | null; kind: LevelKind }
export interface LevelCheck { label: string; kind: LevelKind; price: number; deviationPct: number; status: LevelStatus }

export const IMPLAUSIBLE_PCT = 25; // >25% dari harga live: hampir pasti salah baca skala / chart aset lain
const ATR_MULT = 5;

/** Toleransi (%) = 5×ATR relatif harga (min 1%); tanpa ATR: 3%. Harga di screenshot diberi toleransi min 2% (bisa usang). */
export function tolerancePct(live: number, atr: number | null, kind: LevelKind): number {
  const base = atr ? Math.max((atr / live) * 100 * ATR_MULT, 1) : 3;
  return kind === 'chart' ? Math.max(base, 2) : base;
}

export function checkLevels(levels: LevelInput[], live: number, atr: number | null): LevelCheck[] {
  return levels
    .filter((l): l is LevelInput & { price: number } => l.price !== null)
    .map((l) => {
      const dev = Math.round((Math.abs(l.price - live) / live) * 10000) / 100;
      const status: LevelStatus = dev > IMPLAUSIBLE_PCT ? 'implausible' : dev > tolerancePct(live, atr, l.kind) ? 'far' : 'ok';
      return { label: l.label, kind: l.kind, price: l.price, deviationPct: dev, status };
    });
}

export function levelWarnings(checks: LevelCheck[], live: number): string[] {
  const out: string[] = [];
  for (const c of checks) {
    if (c.status === 'implausible')
      out.push(`${c.label} (${c.price}) berjarak ${c.deviationPct}% dari harga live ${live} — kemungkinan salah baca skala atau chart aset/periode lain.`);
    else if (c.status === 'far')
      out.push(c.kind === 'chart'
        ? `${c.label} (${c.price}) berbeda ${c.deviationPct}% dari harga live ${live} — screenshot mungkin sudah usang.`
        : `${c.label} (${c.price}) berjarak ${c.deviationPct}% dari harga live ${live} — setup jauh dari harga saat ini.`);
  }
  return out;
}

/** Setup dianggap tidak andal bila entry/SL "implausible". */
export const isSetupReliable = (checks: LevelCheck[]) => !checks.some((c) => c.kind !== 'chart' && c.status === 'implausible');
