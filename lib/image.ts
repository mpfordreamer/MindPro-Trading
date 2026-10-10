/** Kompres di browser → JPEG ≤ ~2.5MB, sisi terpanjang ≤ 1920px. Hasilnya diunggah ke Supabase Storage. */
export async function compressChart(file: File): Promise<Blob> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Format harus PNG, JPG, atau WebP.');
  if (file.size > 15 * 1024 * 1024) throw new Error('File terlalu besar (maks 15MB).');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  for (const q of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', q));
    if (blob && blob.size <= 2.5 * 1024 * 1024) return blob;
  }
  throw new Error('Gambar masih terlalu besar setelah dikompres.');
}
