# Batasan & Aturan Keamanan Sistem: MarketMind AI Professional (limitation.md)

---

## 1. Aturan Mutlak Pengujian AI Agent (*Agent Testing Rule*)

> [!CAUTION]
> **ATURAN MUTLAK PENGUJIAN OLEH AI AGENT:**
> 
> **"Do not test manually to open chrome by ai agent"**
> *(Dilarang melakukan pengujian manual dengan membuka browser Chrome interaktif oleh agen AI).*

### Panduan Penegakan Aturan:
1. **Dilarang Menjalankan Browser GUI:**
   Agen AI dilarang meluncurkan jendela Google Chrome atau peramban visual interaktif untuk melakukan klik manual atau observasi visual langsung, kecuali secara eksplisit diperintahkan oleh pengguna manusia.
2. **Metodologi Pengujian yang Diizinkan:**
   * **Unit & Logic Tests:** Pengujian logika matematika dan validasi skema menggunakan suite `vitest` (`npm run test`).
   * **API & Route Integration Tests:** Pengujian respons endpoint server menggunakan automated HTTP fetch terprogram atau curl headless.
   * **Automated Headless E2E:** Pengujian antarmuka otomatis berbasis `playwright` dalam mode headless murni (`npx playwright test`) tanpa memunculkan jendela GUI peramban ke desktop pengguna.

---

## 2. Batasan Finansial, Regulasi, & Non-Goals

1. **Bukan Penasihat Keuangan (*Not Financial Advice*):**
   * MarketMind AI adalah sistem rekayasa perangkat lunak dan *Decision Support Engine* untuk tujuan analitis dan edukasi probabilitas trading.
   * Seluruh keputusan alokasi modal dan eksekusi transaksi berada di bawah tanggung jawab mutlak masing-masing individu pengguna.
2. **Tidak Melakukan Auto-Trading Langsung (*Non-Execution Engine*):**
   * Sistem tidak terhubung langsung ke API penempatan order broker atau bursa (mis. Binance Futures API Key tidak diberi izin *Trade Execution*).
   * Sistem menghasilkan sinyal rencana (*Trade Plan*), menghitung R:R, dan memberikan alert harga, namun tidak mengeksekusi order beli/jual secara otonom.

---

## 3. Batasan Kuota API & Penegakan Rate Limiting

Untuk menjaga stabilitas sistem dan mencegah lonjakan biaya komputasi yang tidak terkontrol:

| Parameter | Batasan (*Quota Limit*) | Tindakan Saat Melebihi Batas |
|---|---|---|
| **Analisis AI (`/api/analyze`)** | 10 permintaan / jam / user | HTTP 429 Too Many Requests |
| **Chat Dewan (`/api/chat`)** | 60 pesan / jam / user | HTTP 429 Too Many Requests |
| **IP Publik (Tanpa Sesi)** | $3\times$ batas user terdaftar | HTTP 429 Too Many Requests |
| **TwelveData (Free Tier)** | 8 request / menit & 800 / hari | Dilindungi cache shared 30 dtk; *Stale-on-error* fallback |
| **Binance Vision API** | Data publik candle (bebas key) | Dilindungi cache shared 10 dtk |

*Catatan Operasional:* Produksi tanpa koneksi Upstash Redis akan memberlakukan kebijakan *fail-closed* (mengembalikan status HTTP 500), bukan mengabaikan pembatasan kuota.

---

## 4. Batasan Penyimpanan Berkas & Kebijakan Retensi

1. **Ukuran & Format Gambar:**
   * Maksimal 3 slot gambar per analisis (Daily, 4H, 15M).
   * Ukuran berkas maksimal: 3 MB per gambar di Supabase Storage bucket `charts`.
   * Format yang diterima: JPEG, PNG, dan WebP (wajib lolos verifikasi biner *magic bytes*).
2. **Batas Ukuran Payload Request:**
   * Body request ke `/api/analyze` dibatasi maksimal **50 KB**. Gambar tidak boleh dikirim langsung sebagai Base64 di body HTTP; klien wajib mengunggah ke Supabase Storage terlebih dahulu dan hanya mengirimkan referensi *path* berkas.
3. **Kebijakan Retensi Draft Otomatis:**
   * Analisis yang baru dibuat disimpan sebagai draft berstatus `saved: false`.
   * Draft yang tidak disimpan secara permanen oleh pengguna dalam 7 hari akan dihapus otomatis oleh tugas cron harian (`/api/cron/cleanup`).
   * Gambar chart di storage yang tidak lagi direferensikan oleh analisis tersimpan (>7 hari) akan dibersihkan secara otomatis.

---

## 5. Batasan Lingkungan Serverless & Waktu Eksekusi (*Timeouts*)

1. **Batas Waktu Eksekusi (*Execution Duration*):**
   * Endpoint `/api/analyze`: Dikonfigurasi `maxDuration = 60` detik. Jika respons Gemini atau ingesti data melebihi 60 detik, serverless function akan dihentikan paksa oleh infrastruktur.
   * Endpoint `/api/chat`: Dikonfigurasi `maxDuration = 30` detik.
2. **Keterbatasan Penjadwalan Cron (Vercel Hobby vs Pro):**
   * Lingkungan Vercel Hobby melarang interval cron lebih sering dari 1 kali sehari. Oleh karena itu, berkas `vercel.json` repositori hanya menjadwalkan cleanup harian (`03:00 UTC`).
   * Evaluasi alert harga 5-menit (`/api/cron/alerts`) pada lingkungan Hobby memerlukan pemicu dari luar (seperti Upstash QStash atau cron-job.org) menggunakan otentikasi header `Authorization: Bearer <CRON_SECRET>`.
