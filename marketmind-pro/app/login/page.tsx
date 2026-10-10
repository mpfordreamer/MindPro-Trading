'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = createClient();
    const { error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: error.message });
    if (mode === 'up') return setMsg({ ok: true, text: 'Cek email Anda untuk konfirmasi akun.' });
    location.href = '/';
  }

  return (
    <main className="mx-auto mt-24 max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100">
      <h1 className="text-xl font-semibold">MarketMind AI</h1>
      <p className="mb-4 text-sm text-slate-400">{mode === 'in' ? 'Masuk untuk memulai analisa' : 'Buat akun baru'}</p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" autoComplete="email" />
        </label>
        <label className="block text-sm">Password
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        </label>
        {msg && <p role="status" className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-emerald-500 py-2 font-medium text-slate-950 disabled:opacity-50">{busy ? 'Memproses…' : mode === 'in' ? 'Masuk' : 'Daftar'}</button>
      </form>
      <button onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="mt-3 text-sm text-slate-400 underline">{mode === 'in' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}</button>
      <p className="mt-4 text-xs text-slate-400">Bukan nasihat keuangan. Gunakan manajemen risiko.</p>
    </main>
  );
}
