import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-100">Halaman tidak ditemukan</h1>
      <Link href="/" className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Kembali ke Analisa</Link>
    </main>
  );
}
