import { describe, expect, it } from 'vitest';
import { alertMessage } from '@/lib/alertMessages';
import { isValidDiscordWebhook, maskWebhook } from '@/lib/discordUrl';
import { buildAnalysisEmbed, buildShareText, clip, type ShareSource } from '@/lib/shareFormat';
import { fmtPrice, pdfFileName, pdfSafe } from '@/lib/pdfFormat';

const src: ShareSource = {
  asset: 'BTC/USDT', timeframe: '4H', marketType: 'Crypto', overallDecision: 'BUY', confidenceScore: 72,
  consensus: { bullishPct: 60, bearishPct: 28, neutralPct: 12 },
  tradeSetup: { bias: 'BULLISH', entryLow: 100, entryHigh: 102, stopLoss: 98, takeProfit1: 110, takeProfit2: null },
  riskReward: { rr1: 2 }, warnings: ['a', 'b', 'c', 'd'], topDown: { alignment: 'ALIGNED' },
};

describe('discord webhook validation (anti-SSRF)', () => {
  const id = '123456789012345678', tok = 'abcdefghijklmnopqrstuvwxyz_ABCDEF-123';
  it('menerima webhook sah', () => {
    expect(isValidDiscordWebhook(`https://discord.com/api/webhooks/${id}/${tok}`)).toBe(true);
    expect(isValidDiscordWebhook(`https://canary.discord.com/api/webhooks/${id}/${tok}`)).toBe(true);
  });
  it('menolak host/skema/format palsu', () => {
    for (const u of [
      `http://discord.com/api/webhooks/${id}/${tok}`,
      `https://discord.com.evil.com/api/webhooks/${id}/${tok}`,
      `https://discord.com@evil.com/api/webhooks/${id}/${tok}`,
      `https://evil.com/https://discord.com/api/webhooks/${id}/${tok}`,
      `https://discord.com/api/webhooks/${id}/${tok}/../../x`,
      `https://discord.com/api/webhooks/${id}/${tok}?x=1`,
      `https://127.0.0.1/api/webhooks/${id}/${tok}`,
      '',
    ]) expect(isValidDiscordWebhook(u)).toBe(false);
  });
  it('mask tidak membocorkan token', () => expect(maskWebhook(`https://discord.com/api/webhooks/${id}/${tok}`).includes('abcdef')).toBe(false));
});

describe('share format', () => {
  it('embed: mention diblokir, batas panjang, peringatan maks 3', () => {
    const e = buildAnalysisEmbed(src, '@everyone ' + 'x'.repeat(500));
    expect(e.allowed_mentions.parse.length).toBe(0);
    expect(e.embeds[0].description!.length <= 280).toBe(true);
    const warn = e.embeds[0].fields.find((f) => f.name === 'Peringatan')!;
    expect(warn.value.split('\n').length).toBe(3);
    expect(e.embeds[0].footer.text).toContain('Bukan nasihat keuangan');
  });
  it('teks Telegram memuat setup & disclaimer', () => {
    const t = buildShareText(src, '');
    expect(t).toContain('R:R 1:2');
    expect(t).toContain('Bukan nasihat keuangan');
  });
  it('setup netral tanpa level tidak menampilkan angka palsu', () => {
    const t = buildShareText({ ...src, tradeSetup: { bias: 'NEUTRAL', entryLow: null, entryHigh: null, stopLoss: null, takeProfit1: null, takeProfit2: null }, riskReward: { rr1: null } }, '');
    expect(t).toContain('Tidak ada setup');
  });
  it('clip', () => { expect(clip('abcdef', 4)).toBe('abc…'); expect(clip('ab', 4)).toBe('ab'); });
});

describe('alertMessage', () => {
  const ctx = { asset: 'BTC/USDT', timeframe: '4H', direction: 'LONG' as const, entry: 100, stopLoss: 98, takeProfit: 110, price: 108.5 };
  it('judul berbeda per jenis, ada disclaimer', () => {
    const titles = (['tp_near', 'tp_hit', 'sl_near', 'sl_hit'] as const).map((k) => alertMessage(k, ctx).title);
    expect(new Set(titles).size).toBe(4);
    expect(alertMessage('sl_near', ctx).body).toContain('Bukan nasihat keuangan');
  });
  it('hit mengarahkan ke jurnal; both-hit memberi catatan ambigu', () => {
    expect(alertMessage('tp_hit', ctx).body).toContain('Jurnal');
    expect(alertMessage('sl_hit', { ...ctx, bothHit: true }).body).toContain('tidak dapat dipastikan');
    expect(alertMessage('tp_near', ctx).body.includes('Jurnal')).toBe(false);
  });
});

describe('pdfSafe', () => {
  it('mengganti simbol umum & membuang emoji', () => {
    expect(pdfSafe('Naik → 100 ≥ 90 🚀')).toBe('Naik -> 100 >= 90');
  });
  it('mempertahankan huruf Latin, tanda baca tipografis', () => {
    expect(pdfSafe('Café — “ok” • 5€')).toBe('Café — “ok” • 5€');
  });
  it('nama file aman', () => {
    expect(pdfFileName('BTC/USDT', '4H', '2026-10-09T10:00:00Z')).toBe('MarketMind_BTC-USDT_4H_2026-10-09.pdf');
    expect(fmtPrice(null)).toBe('-');
  });
});
