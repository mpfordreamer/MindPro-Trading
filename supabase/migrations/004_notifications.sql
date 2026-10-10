-- Fase 4: kanal notifikasi per-user + idempotensi alert.
create table public.notification_channels (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id bigint,
  telegram_link_hash text,            -- sha256 dari kode tautan sekali pakai
  telegram_link_expires timestamptz,
  discord_webhook_url text,           -- webhook pribadi user (divalidasi ketat di server)
  alerts_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create unique index notification_channels_chat_uidx on public.notification_channels (telegram_chat_id) where telegram_chat_id is not null;
create index notification_channels_link_idx on public.notification_channels (telegram_link_hash) where telegram_link_hash is not null;

alter table public.notification_channels enable row level security;
-- Sengaja HANYA select: chat_id & webhook hanya boleh ditulis server (service role) setelah verifikasi,
-- agar user tidak bisa mengarahkan alert ke chat orang lain.
create policy "nc_select_own" on public.notification_channels for select using (auth.uid() = user_id);

alter table public.alerts drop constraint alerts_kind_check;
alter table public.alerts add constraint alerts_kind_check check (kind in ('sl_near','sl_hit','tp_near','tp_hit','custom'));
-- Satu alert otomatis per (trade, jenis, kanal): insert = "klaim" agar cron tidak mengirim ganda.
create unique index alerts_auto_uidx on public.alerts (journal_id, kind, channel) where journal_id is not null;
