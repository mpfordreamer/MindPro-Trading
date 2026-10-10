/** Helvetica bawaan PDF hanya mendukung WinAnsi. Teks dari AI dibersihkan agar tidak muncul kotak/rusak. */
const MAP: [RegExp, string][] = [[/→/g, '->'], [/←/g, '<-'], [/≥/g, '>='], [/≤/g, '<='], [/≈/g, '~'], [/×/g, 'x'], [/[\u2212]/g, '-'], [/[\u00A0\u2009\u202F]/g, ' ']];
export function pdfSafe(text: string): string {
  let s = text;
  for (const [re, to] of MAP) s = s.replace(re, to);
  return s.replace(/[^\x09\x0A\x20-\x7E\xA1-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, '').replace(/[ \t]+/g, ' ').trim();
}
export const fmtPrice = (n: number | null | undefined) => (n === null || n === undefined ? '-' : String(n));
export const pdfFileName = (asset: string, timeframe: string, iso: string) =>
  `MarketMind_${asset.replace(/[^A-Za-z0-9]+/g, '-')}_${timeframe}_${iso.slice(0, 10)}.pdf`;
