-- Case messaging thread (Karen <-> client) with voice message support.
--
-- Text and voice messages live in one table; voice audio files are stored
-- in the private "case-audio" bucket. All writes go through server-side
-- workflows (service role) after explicit auth checks; clients get a
-- read-only RLS policy for their own thread.

create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role public.actor_role not null default 'client',
  body text check (body is null or char_length(body) <= 8000),
  audio_path text,
  audio_duration_seconds integer check (
    audio_duration_seconds is null
    or (audio_duration_seconds >= 0 and audio_duration_seconds <= 3600)
  ),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint case_messages_has_content check (
    body is not null or audio_path is not null
  )
);

comment on table public.case_messages is
  'Karen<->client case conversation. Voice audio lives in the private case-audio bucket; this table stores metadata and text. Case decisions themselves remain with Karen per the constitution.';

alter table public.case_messages enable row level security;

create policy "case_messages_select_own"
on public.case_messages
for select
to authenticated
using (profile_id = (select auth.uid()));

create index if not exists case_messages_case_created_idx
  on public.case_messages (case_id, created_at desc);

-- Private bucket for voice messages.
insert into storage.buckets (id, name, public)
values ('case-audio', 'case-audio', false)
on conflict (id) do nothing;
