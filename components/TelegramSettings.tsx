'use client';
import { useState } from 'react';
import { ApiClientError, apiDelete, apiPatch, apiPost, apiRequest } from '@/lib/apiClient';
import { useApi } from '@/hooks/useApi';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

interface Prefs { telegram: { available: boolean; linked: boolean }; discord: { personalConfigured: boolean; masked: string | null; sharedAvailable: boolean }; alertsEnabled: boolean }

export default function TelegramSettings() {
  const { data, error, loading, reload } = useApi<Prefs>('/api/notifications');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<{ deepLink: string; expiresAt: string } | null>(null);
  const [hook, setHook] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function act(key: string, fn: () => Promise<unknown>, okText: string) {
    setBusy(key); setNote(null);
    try { await fn(); setNote({ ok: true, text: okText }); reload(); }
    catch (e) { setNote({ ok: false, text: e instanceof ApiClientError ? e.message : 'Terjadi kesalahan.' }); }
    finally { setBusy(null); }
  }

  if (loading && !data) return <div role="status" aria-label="Memuat pengaturan" className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>;
  if (error) return <ErrorState error={error} onRetry={reload} retrying={loading} />;
  if (!data) return null;
  const btn = 'rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-emerald-500 disabled:opacity-50';

  return (
    <div className="space-y-4 text-sm">
      {note && <p role={note.ok ? 'status' : 'alert'} className={note.ok ? 'text-emerald-400' : 'text-red-400'}>{note.text}</p>}

      <section aria-labelledby="tg-h" className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 id="tg-h" className="font-semibold">Telegram</h2>
        {!data.telegram.available ? <p className="text-slate-400">Telegram belum dikonfigurasi di server.</p> : data.telegram.linked ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-emerald-400">● Terhubung</span>
            <button className={btn} disabled={!!busy} onClick={() => act('tg-test', () => apiPost('/api/notifications/test', { channel: 'telegram' }), 'Pesan tes dikirim ke Telegram.')}>Kirim tes</button>
            <button className={btn} disabled={!!busy} onClick={() => act('tg-un', () => apiDelete('/api/notifications/telegram'), 'Telegram diputus.')}>Putuskan</button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-slate-400">Tautkan chat pribadi Anda. Kode berlaku 15 menit dan sekali pakai.</p>
            <button className={btn} disabled={!!busy} onClick={() => act('tg-link', async () => setLink(await apiPost('/api/notifications/telegram/link', {})), 'Kode dibuat. Buka tautan lalu tekan Start di Telegram.')}>Hubungkan Telegram</button>
            {link && <p><a href={link.deepLink} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">Buka Telegram & tekan Start</a> <span className="text-slate-400">(berlaku sampai {new Date(link.expiresAt).toLocaleTimeString('id-ID')})</span> — lalu <button className="underline" onClick={reload}>segarkan status</button>.</p>}
          </div>
        )}
      </section>

      <section aria-labelledby="dc-h" className="space-y-2 rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 id="dc-h" className="font-semibold">Discord</h2>
        {data.discord.personalConfigured ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-slate-950 px-2 py-1 text-xs">{data.discord.masked}</code>
            <button className={btn} disabled={!!busy} onClick={() => act('dc-test', () => apiPost('/api/notifications/test', { channel: 'discord' }), 'Pesan tes dikirim ke Discord.')}>Kirim tes</button>
            <button className={btn} disabled={!!busy} onClick={() => act('dc-del', () => apiRequest('PUT', '/api/notifications/discord', { webhookUrl: null }), 'Webhook dihapus.')}>Hapus</button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-slate-300">Webhook pribadi (Pengaturan Server → Integrasi → Webhook)
              <input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="https://discord.com/api/webhooks/…" autoComplete="off" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5" />
            </label>
            <button className={btn} disabled={!!busy || !hook} onClick={() => act('dc-set', async () => { await apiRequest('PUT', '/api/notifications/discord', { webhookUrl: hook.trim() }); setHook(''); }, 'Webhook disimpan.')}>Simpan webhook</button>
            {data.discord.sharedAvailable && <p className="text-xs text-slate-400">Tanpa webhook pribadi, tombol Bagikan memakai kanal bersama. <b>Alert SL/TP tidak pernah dikirim ke kanal bersama.</b></p>}
          </div>
        )}
      </section>

      <section aria-labelledby="al-h" className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 id="al-h" className="font-semibold">Alert otomatis</h2>
        <label className="mt-2 flex items-center gap-2">
          <input type="checkbox" checked={data.alertsEnabled} disabled={!!busy} onChange={(e) => act('al', () => apiPatch('/api/notifications', { alertsEnabled: e.target.checked }), e.target.checked ? 'Alert diaktifkan.' : 'Alert dimatikan.')} />
          Kirim alert saat harga mendekati (≥80% jarak) atau menyentuh SL/TP trade yang terbuka di jurnal
        </label>
        <p className="mt-1 text-xs text-slate-400">Alert dikirim ke kanal pribadi Anda di atas. Harga dicek berkala (tiap beberapa menit), bukan real-time; sentuhan singkat tetap terdeteksi lewat high/low candle. Bukan nasihat keuangan.</p>
      </section>
    </div>
  );
}
