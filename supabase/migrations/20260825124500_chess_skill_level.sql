create table if not exists public.chess_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  skill_level text not null default 'beginner' check (skill_level in ('beginner', 'casual', 'intermediate', 'advanced', 'grandmaster')),
  updated_at timestamptz not null default now()
);

alter table public.chess_preferences enable row level security;
revoke all on table public.chess_preferences from anon, authenticated;
grant select, insert, update on table public.chess_preferences to authenticated;

create policy "chess_preferences_select_own" on public.chess_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "chess_preferences_insert_own" on public.chess_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "chess_preferences_update_own" on public.chess_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
