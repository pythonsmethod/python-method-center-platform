create table if not exists public.chess_appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 180),
  client_message text not null default '' check (char_length(client_message) <= 1000),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chess_appointments_client_created_idx
  on public.chess_appointments(client_id, created_at desc);
create index if not exists chess_appointments_provider_scheduled_idx
  on public.chess_appointments(provider_id, scheduled_at desc);
create index if not exists chess_appointments_status_scheduled_idx
  on public.chess_appointments(status, scheduled_at);

create table if not exists public.chess_online_games (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.chess_appointments(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  current_fen text not null,
  pgn text not null default '',
  version integer not null default 0 check (version >= 0),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed')),
  result text check (result is null or result in ('1-0', '0-1', '1/2-1/2')),
  last_move_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists chess_online_games_client_updated_idx
  on public.chess_online_games(client_id, updated_at desc);
create index if not exists chess_online_games_provider_updated_idx
  on public.chess_online_games(provider_id, updated_at desc);

alter table public.chess_appointments enable row level security;
alter table public.chess_online_games enable row level security;

revoke all on table public.chess_appointments, public.chess_online_games from anon, authenticated;
grant select on table public.chess_appointments, public.chess_online_games to authenticated;

create policy "chess_appointments_participants_select"
on public.chess_appointments for select
to authenticated
using ((select auth.uid()) = client_id or (select auth.uid()) = provider_id);

create policy "chess_online_games_participants_select"
on public.chess_online_games for select
to authenticated
using ((select auth.uid()) = client_id or (select auth.uid()) = provider_id);

do $$
begin
  alter publication supabase_realtime add table public.chess_online_games;
exception
  when duplicate_object then null;
end
$$;

comment on table public.chess_appointments is
  'Client requests for a scheduled online chess game with Karen.';
comment on table public.chess_online_games is
  'Authoritative shared chess positions. Clients only read; validated moves are written by the server.';
