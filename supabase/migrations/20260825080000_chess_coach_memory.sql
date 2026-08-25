create table if not exists public.chess_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  current_fen text not null,
  pgn text not null default '',
  result text check (result is null or result in ('1-0', '0-1', '1/2-1/2')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists chess_games_one_active_per_user_idx on public.chess_games(user_id) where status = 'active';
create index if not exists chess_games_user_updated_idx on public.chess_games(user_id, updated_at desc);

create table if not exists public.chess_conversations (
  id bigint generated always as identity primary key,
  game_id uuid references public.chess_games(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  position_fen text not null,
  created_at timestamptz not null default now()
);

create index if not exists chess_conversations_user_created_idx on public.chess_conversations(user_id, created_at desc);
create index if not exists chess_conversations_game_created_idx on public.chess_conversations(game_id, created_at);

alter table public.chess_games enable row level security;
alter table public.chess_conversations enable row level security;
revoke all on table public.chess_games, public.chess_conversations from anon, authenticated;
grant select, insert, update, delete on table public.chess_games, public.chess_conversations to authenticated;
grant usage, select on sequence public.chess_conversations_id_seq to authenticated;

create policy "chess_games_select_own" on public.chess_games for select to authenticated using ((select auth.uid()) = user_id);
create policy "chess_games_insert_own" on public.chess_games for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "chess_games_update_own" on public.chess_games for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "chess_games_delete_own" on public.chess_games for delete to authenticated using ((select auth.uid()) = user_id);
create policy "chess_conversations_select_own" on public.chess_conversations for select to authenticated using ((select auth.uid()) = user_id);
create policy "chess_conversations_insert_own" on public.chess_conversations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "chess_conversations_update_own" on public.chess_conversations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "chess_conversations_delete_own" on public.chess_conversations for delete to authenticated using ((select auth.uid()) = user_id);
