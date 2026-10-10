# MarketMind AI Professional — Fase 1–5

## Setup
```bash
npx create-next-app@latest marketmind-pro --typescript --tailwind --eslint --app
# salin isi folder ini ke atas proyek tsb (timpa next.config.ts), lalu:
npm i lightweight-charts zod server-only @supabase/supabase-js @supabase/ssr @upstash/ratelimit @upstash/redis
npm i -D vitest @vitest/coverage-v8
cp .env.example .env.local   # isi semua nilai
```
1. Supabase → SQL Editor → jalankan `001_phase1.sql` lalu `002_chart_storage.sql` (bucket privat `charts` + RLS per folder user).
2. Upstash → buat database Redis → salin REST URL & token.
3. `tsconfig.json`: pastikan `"strict": true`. Tambahkan script `"test": "vitest run --coverage"`.
4. `npm run dev`, daftar di `/login`, `npm test`.

## Menyambungkan prototype
Pindahkan UI prototype ke `app/page.tsx` (`'use client'`), lalu:
- HAPUS: `runMultiAgentAnalysis` (fetch Gemini), `generateFallbackAnalysis`, `handleSendChatMessage` (fetch Gemini), semua `apiKey = ""`, dan `Math.random()` pada agent.
- GANTI analisa dengan `const { result, error, loading, run, retry } = useAnalyze();` dan panggil
  `run({ asset, timeframe, marketType, userNotes, fundamentalContext, image: await fileToImagePayload(file) })`.
- Saat `error` ada, render `<ErrorState error={error} onRetry={retry} retrying={loading} />`; jangan render hasil lama.
- Gabungkan `result.agentEvaluations` dengan profil statis dari `lib/agents.ts` (by `id`) untuk avatar/warna.
- Konsensus: pakai `result.consensus` (dihitung server). R:R: `result.riskReward`. Tampilkan `result.warnings`.
- Bungkus bagian besar (Debate Arena, Chat) dengan `<ErrorBoundary>`.
- Chat: `apiPost('/api/chat', { message, history, context })` (lihat `ChatRequestSchema`).

## Catatan keputusan desain
- Konsensus, R:R, dan peringatan **dihitung server**, bukan dipercaya dari AI.
- Harga di setup bertipe `number | null`; `null` = "tidak cukup data". Setup yang arahnya tidak konsisten (mis. long dengan SL di atas entry) ditolak Zod → error `AI_INVALID_RESPONSE` + Retry.
- Rate limit: 10 analisa/jam/user, 60 chat/jam/user, IP 3× lebih longgar. Produksi tanpa Upstash → gagal tertutup (500), bukan dilewati.
- Gambar dikompres di browser (JPEG ≤1920px). Fase 2 memindahkan upload ke Supabase Storage karena 3 gambar tidak muat di body 4.5MB Vercel.
- `SUPABASE_URL`/`ANON_KEY` memakai prefix `NEXT_PUBLIC_` (diperlukan browser; anon key memang publik, dilindungi RLS). Service role & Gemini key tanpa prefix.

---
## Fase 2 — Multi-timeframe & Live Chart

### Alur
1. Browser mengompres tiap screenshot (JPEG ≤1920px) dan **mengunggah langsung ke Supabase Storage** (`charts/<userId>/<uuid>.jpg`). `/api/analyze` hanya menerima *path* (body < 50KB), sehingga batas 4.5MB Vercel tidak lagi jadi masalah.
2. Server mengunduh gambar (RLS berlaku), memverifikasi **magic bytes**, lalu mengirim ke Gemini berurutan tinggi→rendah (Daily → 4H → 15M) bersama data live.
3. Data live paralel: Binance (`data-api.binance.vision`, tanpa key) untuk Crypto; TwelveData untuk Forex/Saham/Emas/Indeks (`TWELVEDATA_API_KEY`, dikirim via header). Harga live = close candle berjalan; ATR14 dihitung dari 200 candle.
4. AI wajib mengisi `chartReadings` (harga yang ia baca dari sumbu gambar, tanpa menyalin data live), `timeframeAnalysis`, dan `topDown` (alignment + trigger entry).
5. Server membandingkan: entry/SL dan harga terakhir di chart vs harga live. Toleransi = 5×ATR (min 1%; chart min 2%). Lebih jauh → `far` (peringatan, mis. screenshot usang). >25% → `implausible` (kemungkinan salah baca skala/aset lain) dan `setupReliable=false`.

### Perilaku saat data live gagal
Analisa **tetap berjalan** dengan peringatan "Data harga live tidak tersedia" — bukan data palsu. Hanya kegagalan AI/validasi yang menjadi error + Retry.

### Pemakaian di UI
```tsx
const LiveChart = dynamic(() => import('@/components/LiveChart'), { ssr: false });
const [charts, setCharts] = useState<ChartSlot[]>([]);

<MultiTimeframeUploader value={charts} onChange={setCharts} disabled={loading} />
run({ asset, timeframe, marketType, userNotes, fundamentalContext, charts: toChartRefs(charts) });

{result && <>
  <TopDownCard result={result} />
  <LiveChart asset={result.asset} marketType={result.marketType} timeframe={result.timeframe} levels={levelsFromSetup(result.tradeSetup)} />
</>}
```
`LiveChart` memakai API **lightweight-charts v5** (`chart.addSeries(CandlestickSeries, …)`). Bila memakai v4, ganti dengan `chart.addCandlestickSeries()`.

### Catatan
- Polling chart tiap 30 dtk (berhenti saat tab tersembunyi); limit `market` 300/jam/user. Free tier TwelveData: 8 req/menit & 800/hari — cukup untuk 1 user, perlu paket berbayar untuk banyak user.
- Gambar tetap tersimpan di Storage untuk jurnal (Fase 3). Kebijakan retensi/penghapusan otomatis ditambahkan di Fase 3.
- Prompt version: `2026-10-v2`.

### Cache data candle (Fase 2.1)
`/api/market/candles` dan `/api/analyze` sama-sama lewat `fetchCandles()` → `lib/cache.ts`:
- Kunci `mm:candles:<provider>:<simbol>:<timeframe>` **dibagi ke semua user** (data pasar publik). Selalu menyimpan 300 candle; permintaan `limit` lain hanya di-slice.
- TTL segar: Binance 10 dtk, TwelveData 30 dtk (hemat kuota 8/menit & 800/hari). N user × polling 30 dtk pada simbol yang sama ≈ 1 panggilan provider per TTL.
- **Single-flight**: permintaan serentak ke kunci yang sama menunggu satu fetch yang sama.
- **Stale-on-error**: bila provider gagal/429, data ≤5 menit tetap disajikan dengan `stale: true` (chart menampilkan badge "Data tertunda"; analisa menambah peringatan).
- Penyimpanan: Upstash Redis bila diset (dibagi lintas instance serverless), jika tidak memori per-instance. Kegagalan Redis tidak pernah menggagalkan request.
- Respons memakai `Cache-Control: private, max-age=5`.
Catatan: cache memori per-instance di Vercel kurang efektif — untuk produksi, Upstash sebaiknya aktif.

---
## Fase 3 — Database, Jurnal, Akurasi Agent
Jalankan `supabase/migrations/003_phase3.sql`, lalu set `CRON_SECRET` (≥32 karakter acak) di Vercel; `vercel.json` sudah menjadwalkan `/api/cron/cleanup` harian 03:00 UTC.

### Alur data
1. **Setiap analisa tersimpan otomatis sebagai draft** (`analyses` + 25 `agent_evaluations` + `debates`) oleh server — klien tidak mengirim ulang hasil, jadi tidak bisa dipalsukan. Respons memuat `analysisId`.
2. **Simpan** = `PATCH /api/analyses/:id {saved:true}`. Draft tak tersimpan dihapus cron setelah 7 hari, lalu gambar chart yatim >7 hari dihapus dari Storage (gagal-tertutup bila pengecekan referensi error).
3. **Tambah ke jurnal** (`POST /api/journal`): terisi dari setup AI. Geometri mustahil (mis. long dengan SL di atas entry) **ditolak**. Peringatan (R:R < 1:1.5, SL < 0.1% dari entry, setup tak andal, arah melawan AI) hanya lolos bila `acknowledgeRisk: true`. Menambah ke jurnal otomatis menandai analisa `saved`.
4. **Konfirmasi hasil** (`POST /api/journal/:id/outcome`, Win/Loss/Breakeven + harga exit opsional). R dihitung server: dengan exit = R aktual; tanpa exit = win → R:R rencana, loss → −1, BE → 0. Label yang bertentangan dengan harga exit ditolak (mis. "Win" tapi R ≤ 0).

### Definisi statistik (agar tidak ambigu)
- **Win rate** = Win / (Win + Loss); Breakeven tidak dihitung.
- **Profit factor** = total R positif / total |R negatif|; `null` (UI: ∞ / —) bila belum ada loss.
- **Avg R:R** = rata-rata R:R *rencana*; R aktual rata-rata ditampilkan sebagai catatan.
- **Akurasi agent**: Win → pasar bergerak searah trade; Loss → berlawanan. Agent benar bila biasnya searah dengan arah pasar itu. Breakeven & bias NEUTRAL = abstain. **Ini proxy** — trade dengan SL/TP tertentu bukan ukuran murni arah pasar.
- **Peringkat** memakai batas bawah interval Wilson 95%, bukan persentase mentah, agar 1/1 benar (100%) tidak mengalahkan 80/100. Agent dengan n<5 diberi badge. Leaderboard bersifat **per-user** (riwayat Anda sendiri, dilindungi RLS); leaderboard lintas-user perlu agregasi anonim terpisah.

### Integrasi UI
Setelah analisa: `<SaveAnalysisButton analysisId={result.analysisId} />` dan `<AddToJournalDialog result={result} />`. Halaman: `/journal`, `/leaderboard` (tambahkan tautan di navigasi).

---
## Fase 4 — Telegram, Discord, Alert, PDF
Jalankan `supabase/migrations/004_notifications.sql`. Install: `npm i @react-pdf/renderer`.

### Setup Telegram (sekali)
1. @BotFather → `/newbot` → isi `TELEGRAM_BOT_TOKEN` & `TELEGRAM_BOT_USERNAME`; buat `TELEGRAM_WEBHOOK_SECRET` acak (A-Za-z0-9_-, ≥16).
2. Daftarkan webhook setelah deploy:
```bash
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://DOMAIN-ANDA/api/telegram/webhook" -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" -d "allowed_updates=[\"message\"]"
```
3. User: Pengaturan Notifikasi → Hubungkan Telegram → tekan Start. Penautan memakai **kode sekali pakai 15 menit (hanya hash disimpan)**; user tidak mengetik chat ID. Tabel `notification_channels` sengaja tanpa policy tulis untuk klien, sehingga tidak ada yang bisa mengarahkan alert ke chat orang lain.

### Discord
Webhook pribadi per-user (divalidasi ketat: host `discord.com` persis, skema https, tanpa redirect, anti-SSRF; ditampilkan hanya dalam bentuk ter-mask). `DISCORD_WEBHOOK_URL` di env opsional = kanal bersama **hanya untuk tombol Bagikan**; alert tidak pernah ke kanal bersama (akan membocorkan trade antar-user). Pesan dibangun server dari analisa user; `allowed_mentions` dikosongkan.

### Alert SL/TP
`/api/cron/alerts` mengevaluasi trade berstatus *open*: **near** = ≥80% jarak entry→level sudah ditempuh; **hit** = high/low candle 15M sejak trade dicatat menyentuh level (sentuhan singkat di antara dua eksekusi tetap terdeteksi). Jika TP dan SL sama-sama tersentuh, pesan menyatakan urutannya tidak dapat dipastikan. Idempotensi: baris `alerts` di-INSERT lebih dulu (unique journal+jenis+kanal) sebagai klaim, lalu pesan dikirim; gagal kirim → klaim dilepas dan dicoba lagi; Telegram 403/Discord 404 → kanal otomatis diputus.
**Penjadwalan:** `vercel.json` hanya berisi cleanup harian karena **Vercel Hobby menolak cron lebih sering dari harian (deploy gagal)**. Di Pro tambahkan `{ "path": "/api/cron/alerts", "schedule": "*/5 * * * *" }`. Di Hobby gunakan scheduler eksternal (cron-job.org / Upstash QStash) yang memanggil URL itu dengan header `Authorization: Bearer $CRON_SECRET`. Batas: 200 trade per run; riwayat sentuhan ≈ 75 jam (300 candle 15M).

### PDF
`GET /api/export/pdf?analysisId=…` — dibuat server dengan `@react-pdf/renderer` (bukan Puppeteer: tanpa Chromium, cold start & memori jauh lebih kecil). Konten dari database, bukan kiriman klien. Teks AI dibersihkan (`pdfSafe`) karena font bawaan hanya WinAnsi (emoji dibuang, → ≥ ≤ diganti). Bagian: header, aset/timeframe, keputusan, konsensus, setup, peringatan, top-down, ringkasan teknikal/fundamental, debat, tabel 25 agent, footer disclaimer + nomor halaman.
Komponen: `<ExportPdfButton analysisId>`, `<ShareButton analysisId>` (modal lazy), halaman `/settings/notifications`.

---
## Fase 5 — Performa & UX
Install: `npm i -D @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom @playwright/test` lalu `npx playwright install chromium`. Tidak ada migrasi database.

### File baru
| File | Fungsi |
|---|---|
| `components/DebateArena.tsx` | Arena debat: toolbar filter, toggle **Detail / Ringkas**, benturan argumen |
| `components/AgentCard.tsx`, `CompactAgentTable.tsx` | Kartu detail & tabel ringkas 25 agent (klik baris → argumen) |
| `components/QuickFilter.tsx`, `Highlight.tsx` | Pencarian (pintasan `/`, `Esc` = hapus) & penyorotan kata kunci tanpa `innerHTML` |
| `components/Toast.tsx` | Toast tanpa dependensi; `useToast()` no-op di luar provider |
| `components/AnalysisSkeleton.tsx`, `EmptyState.tsx`, `BiasBadge.tsx` | Skeleton, empty state, badge bias (warna + simbol + teks) |
| `components/lazy.tsx` | `DebateArenaLazy`, `LiveChartLazy` (`next/dynamic`, `ssr:false`, skeleton) |
| `components/AppShell.tsx`, `app/layout.tsx`, `app/phase5.css` | Navigasi, skip-link, ToastProvider, dark default, reduced-motion |
| `lib/agentFilter.ts`, `lib/prefs.ts`, `hooks/usePreferences.ts` | Logika filter/urut/sorot (murni, teruji) & preferensi tersimpan |
| `app/*/loading.tsx`, `app/not-found.tsx` | Skeleton tingkat rute & 404 |
| `app/dev/debate/page.tsx`, `tests/e2e/*`, `playwright.config.ts` | Harness + E2E (harness mati di produksi kecuali `ENABLE_E2E_HARNESS=1`) |

### Pemakaian
```tsx
import { DebateArenaLazy, LiveChartLazy } from '@/components/lazy';
import { AnalysisSkeleton } from '@/components/AnalysisSkeleton';

{loading && <AnalysisSkeleton />}
{result && <ErrorBoundary fallbackTitle="Debate Arena gagal dimuat"><DebateArenaLazy result={result} /></ErrorBoundary>}
```
Chat: bungkus dengan `dynamic(() => import('@/components/ChatPanel'), { ssr: false })` dan render hanya saat panel dibuka.

### Keputusan desain
- **Filter tidak mengubah konsensus.** Persentase tetap dari 25 agent; UI menyatakannya eksplisit.
- **Hanya mode tampilan & urutan yang disimpan** (localStorage, divalidasi Zod per-field). Filter sengaja tidak disimpan agar agent tidak "hilang" diam-diam. Belum sinkron lintas-perangkat (butuh kolom `profiles.preferences` + endpoint).
- Seluruh `text-slate-500/600` diganti `slate-400` (kontras 4.2:1 / 2.7:1 → 7.9:1; AA butuh 4.5:1).
- PDF sudah server-side sejak Fase 4, jadi tidak ada library PDF di bundle klien; `DiscordModal` sudah lazy.

### Belum dikerjakan
Sentry & PostHog (butuh DSN/key & `withSentryConfig`); `ErrorBoundary` masih `console.error`.
