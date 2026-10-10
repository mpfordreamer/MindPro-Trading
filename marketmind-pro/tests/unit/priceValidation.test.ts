import { describe, expect, it } from 'vitest';
import { checkLevels, isSetupReliable, levelWarnings, tolerancePct } from '@/lib/priceValidation';

describe('tolerancePct', () => {
  it('5×ATR relatif, minimal 1%', () => {
    expect(tolerancePct(100, 1, 'entry')).toBe(5);
    expect(tolerancePct(100, 0.05, 'entry')).toBe(1);
  });
  it('tanpa ATR = 3%; chart minimal 2%', () => {
    expect(tolerancePct(100, null, 'entry')).toBe(3);
    expect(tolerancePct(100, 0.05, 'chart')).toBe(2);
  });
});

describe('checkLevels', () => {
  const live = 100;
  it('ok / far / implausible', () => {
    const r = checkLevels([
      { label: 'a', price: 101, kind: 'entry' },
      { label: 'b', price: 110, kind: 'entry' },
      { label: 'c', price: 150, kind: 'stop' },
    ], live, 1);
    expect(r.map((x) => x.status).join()).toBe('ok,far,implausible');
  });
  it('mengabaikan harga null', () => {
    expect(checkLevels([{ label: 'x', price: null, kind: 'entry' }], live, 1).length).toBe(0);
  });
  it('setup tidak andal bila entry/SL implausible, chart tidak dihitung', () => {
    expect(isSetupReliable(checkLevels([{ label: 'c', price: 500, kind: 'chart' }], live, 1))).toBe(true);
    expect(isSetupReliable(checkLevels([{ label: 'e', price: 500, kind: 'entry' }], live, 1))).toBe(false);
  });
  it('menghasilkan peringatan untuk far dan implausible saja', () => {
    const w = levelWarnings(checkLevels([{ label: 'ok', price: 100.5, kind: 'entry' }, { label: 'jauh', price: 110, kind: 'entry' }, { label: 'ngawur', price: 300, kind: 'stop' }], live, 1), live);
    expect(w.length).toBe(2);
  });
});
