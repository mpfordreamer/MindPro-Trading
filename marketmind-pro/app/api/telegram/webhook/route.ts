import { logAudit } from '@/lib/audit';
import { hashCode } from '@/lib/linkCode';
import { adminClient } from '@/lib/supabase/admin';
import { sendTelegram, verifyTelegramSecret } from '@/lib/telegram';
import { TelegramUpdateSchema } from '@/lib/validators';

export const runtime = 'nodejs';

/** Dipanggil Telegram. Diautentikasi dengan secret_token (bukan sesi user). Selalu 200 agar Telegram tidak mengulang. */
export async function POST(req: Request) {
  if (!verifyTelegramSecret(req)) return new Response('forbidden', { status: 403 });
  const parsed = TelegramUpdateSchema.safeParse(await req.json().catch(() => null));
  const msg = parsed.success ? parsed.data.message : undefined;
  if (!msg || msg.chat.type !== 'private') return Response.json({ ok: true });

  const chatId = msg.chat.id;
  const text = (msg.text ?? '').trim();
  const sb = adminClient();

  const start = text.match(/^\/start\s+([a-f0-9]{32})$/i);
  if (start) {
    // Satu UPDATE atomik: kode harus cocok & belum kedaluwarsa; langsung dikonsumsi.
    const { data, error } = await sb.from('notification_channels')
      .update({ telegram_chat_id: chatId, telegram_link_hash: null, telegram_link_expires: null, updated_at: new Date().toISOString() })
      .eq('telegram_link_hash', hashCode(start[1].toLowerCase())).gt('telegram_link_expires', new Date().toISOString()).select('user_id');
    if (error?.code === '23505') await sendTelegram(chatId, 'Chat ini sudah tertaut ke akun lain. Kirim /stop dari chat ini, lalu coba lagi.');
    else if (error || !data?.length) await sendTelegram(chatId, 'Kode tidak valid atau sudah kedaluwarsa. Buat kode baru di Pengaturan Notifikasi.');
    else {
      await sendTelegram(chatId, '✅ Telegram terhubung ke MarketMind AI. Anda akan menerima alert SL/TP untuk trade yang terbuka di jurnal. Kirim /stop untuk berhenti.');
      await logAudit({ userId: data[0].user_id, action: 'notifications.telegram.linked', requestId: crypto.randomUUID(), ip: 'telegram' });
    }
  } else if (/^\/stop\b/i.test(text)) {
    await sb.from('notification_channels').update({ telegram_chat_id: null }).eq('telegram_chat_id', chatId);
    await sendTelegram(chatId, 'Notifikasi dihentikan. Anda bisa menghubungkan ulang kapan saja dari aplikasi.');
  } else if (/^\/start\b/i.test(text)) {
    await sendTelegram(chatId, 'Halo! Untuk menghubungkan akun, buka Pengaturan Notifikasi di aplikasi MarketMind AI lalu tekan "Hubungkan Telegram".');
  }
  return Response.json({ ok: true });
}
