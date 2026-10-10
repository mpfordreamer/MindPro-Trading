-- Fase 3: analyses, agent_evaluations, debates, trade_journal, trade_outcomes, alerts.
-- (profiles, api_usage, audit_logs ada di 001.) Semua tabel RLS: user hanya akses miliknya.

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset text not null,
  timeframe text not null,
  market_type text not null,
  decision text not null,
  confidence int not null check (confidence between 0 and 100),
  bias text not null check (bias in ('BULLISH','BEARISH','NEUTRAL')),
  entry_low numeric, entry_high numeric, stop_loss numeric, take_profit_1 numeric, take_profit_2 numeric,
  rr1 numeric,
  live_price numeric,
  setup_reliable boolean not null default true,
  consensus jsonb not null,
  warnings jsonb not null default '[]',
  result jsonb not null,                       -- AnalysisResult lengkap (untuk membuka ulang)
  chart_paths text[] not null default '{}',
  prompt_version text not null,
  model text not null,
  request_id uuid not null,
  saved boolean not null default false,        -- false = draft otomatis, dihapus cron setelah 7 hari
  saved_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.analyses (user_id, saved, created_at desc);
create index on public.analyses using gin (chart_paths);

create table public.agent_evaluations (
  id bigint generated always as identity primary key,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id text not null,
  bias text not null check (bias in ('BULLISH','BEARISH','NEUTRAL')),
  conviction int not null check (conviction between 0 and 100),
  argument text not null,
  evidence jsonb not null default '[]',
  highlighted_key text,
  unique (analysis_id, agent_id)
);
create index on public.agent_evaluations (user_id, agent_id);

create table public.debates (
  analysis_id uuid primary key references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  clashes jsonb not null
);

create table public.trade_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete restrict,
  direction text not null check (direction in ('LONG','SHORT')),
  entry_price numeric not null check (entry_price > 0),
  stop_loss numeric not null check (stop_loss > 0),
  take_profit numeric not null check (take_profit > 0),
  planned_rr numeric not null,
  risk_acknowledged boolean not null default false,
  notes text not null default '',
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index on public.trade_journal (user_id, status, created_at desc);

create table public.trade_outcomes (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null unique references public.trade_journal(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  direction text not null check (direction in ('LONG','SHORT')),
  result text not null check (result in ('win','loss','breakeven')),
  exit_price numeric,
  r_multiple numeric not null,
  planned_rr numeric,
  notes text not null default '',
  closed_at timestamptz not null default now()
);
create index on public.trade_outcomes (user_id, closed_at desc);

-- Fase 4 akan mengisi logikanya; tabel disiapkan sekarang.
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid references public.trade_journal(id) on delete cascade,
  asset text not null,
  kind text not null check (kind in ('sl_near','tp_near','custom')),
  trigger_price numeric not null,
  direction text not null check (direction in ('above','below')),
  channel text not null check (channel in ('telegram','discord')),
  status text not null default 'active' check (status in ('active','triggered','cancelled')),
  created_at timestamptz not null default now(),
  triggered_at timestamptz
);
create index on public.alerts (user_id, status);

do $$
declare t text;
begin
  foreach t in array array['analyses','agent_evaluations','debates','trade_journal','trade_outcomes','alerts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s_own" on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
