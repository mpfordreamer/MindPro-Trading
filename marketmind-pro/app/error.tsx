'use client';
export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md p-8 text-center text-slate-100">
      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="mt-2 text-slate-400">Halaman gagal dimuat. Data Anda tidak hilang.</p>
      <button onClick={reset} className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950">Coba Lagi</button>
    </main>
  );
}
