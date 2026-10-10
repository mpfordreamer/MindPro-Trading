import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, parsePrefs } from '@/lib/prefs';

describe('parsePrefs', () => {
  it('null/kosong → default', () => { expect(parsePrefs(null)).toEqual(DEFAULT_PREFS); expect(parsePrefs('')).toEqual(DEFAULT_PREFS); });
  it('JSON rusak → default (tidak melempar)', () => expect(parsePrefs('{bukan json')).toEqual(DEFAULT_PREFS));
  it('bukan objek → default', () => { for (const raw of ['[]', '"x"', '42', 'null']) expect(parsePrefs(raw)).toEqual(DEFAULT_PREFS); });
  it('nilai valid dipakai', () => expect(parsePrefs('{"viewMode":"compact","sort":"conviction"}')).toEqual({ viewMode: 'compact', sort: 'conviction' }));
  it('satu field rusak tidak mereset field lain', () => expect(parsePrefs('{"viewMode":"compact","sort":"ngawur"}')).toEqual({ viewMode: 'compact', sort: 'default' }));
  it('field hilang → default per field', () => expect(parsePrefs('{"sort":"name"}')).toEqual({ viewMode: 'detail', sort: 'name' }));
  it('field asing dibuang', () => expect(parsePrefs('{"viewMode":"compact","evil":1}')).not.toHaveProperty('evil'));
});
