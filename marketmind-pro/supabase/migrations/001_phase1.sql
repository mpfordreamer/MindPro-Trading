-- Fase 1: profiles, api_usage, audit_logs. Tabel Fase 3 menyusul.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferences jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.api_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  latency_ms int,
  status text not null check (status in ('ok','error')),
  error_code text,
  prompt_version text not null,
  request_id uuid not null,
  created_at timestamptz not null default now()
);
create index on public.api_usage (user_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  request_id uuid,
  ip text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.audit_logs (user_id, created_at desc);

alter table public.profiles   enable row level security;
alter table public.api_usage  enable row level security;
alter table public.audit_logs enable row level security;

-- User hanya boleh membaca/ubah miliknya. INSERT api_usage & audit_logs hanya lewat service role (tanpa policy insert).
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "usage_select_own"    on public.api_usage  for select using (auth.uid() = user_id);
create policy "audit_select_own"    on public.audit_logs for select using (auth.uid() = user_id);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
