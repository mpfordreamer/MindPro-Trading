import { expect, test, type Page } from '@playwright/test';

// Butuh akun uji Supabase (email sudah terkonfirmasi): E2E_EMAIL, E2E_PASSWORD. Server dijalankan dengan ENABLE_E2E_HARNESS=1.
const email = process.env.E2E_EMAIL, password = process.env.E2E_PASSWORD;
test.skip(!email || !password, 'Set E2E_EMAIL & E2E_PASSWORD');

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Password').fill(password!);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL('/');
}
const countLine = (page: Page) => page.getByRole('status').filter({ hasText: 'Menampilkan' });

test.beforeEach(async ({ page }) => { await login(page); await page.goto('/dev/debate'); await expect(page.getByRole('heading', { name: 'Debate Arena' })).toBeVisible(); });

test('default: 25 kartu agent', async ({ page }) => {
  await expect(page.getByRole('article')).toHaveCount(25);
  await expect(countLine(page)).toHaveText(/Menampilkan 25 dari 25 agent/);
});

test('Compact View menampilkan tabel 25 baris dan bertahan setelah reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Ringkas' }).click();
  await expect(page.getByRole('row')).toHaveCount(26);
  await page.reload();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ringkas' })).toHaveAttribute('aria-pressed', 'true');
});

test('Quick Filter + pintasan "/" + Reset', async ({ page }) => {
  await page.keyboard.press('/');
  await expect(page.getByLabel('Cari agent atau topik debat')).toBeFocused();
  await page.keyboard.type('fibonacci');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('article')).toHaveCount(25);
  await page.getByLabel('Cari agent atau topik debat').fill('zzzxxx');
  await expect(page.getByText('Tidak ada agent yang cocok')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filter' }).first().click();
  await expect(page.getByRole('article')).toHaveCount(25);
});

test('tidak ada scroll horizontal pada halaman (responsif)', async ({ page }) => {
  for (const mode of ['Detail', 'Ringkas']) {
    await page.getByRole('button', { name: mode }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test('navigasi keyboard: skip link mengarah ke konten', async ({ page }) => {
  await page.goto('/journal');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Lompat ke konten utama' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
});
