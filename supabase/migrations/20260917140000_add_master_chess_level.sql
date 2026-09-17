alter table public.chess_preferences
  drop constraint if exists chess_preferences_skill_level_check;

alter table public.chess_preferences
  add constraint chess_preferences_skill_level_check
  check (skill_level in ('beginner', 'casual', 'intermediate', 'advanced', 'expert', 'master', 'grandmaster'));
