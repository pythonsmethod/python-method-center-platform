-- Conversations with the AI, kept for people who have an account.
--
-- A person who told the assistant about their condition should be able to
-- come back and re-read it instead of asking the same thing again — and
-- Professor Python should be able to see what was asked before he opens
-- the case. Visitors without an account are never recorded here: their
-- messages leave no trace anywhere.

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Kept for convenience when the person already has a case; the thread
  -- itself belongs to the person, not the case.
  case_id uuid references public.client_cases(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Which level of the assistant answered: registered | client.
  tier text not null default 'registered',
  created_at timestamptz not null default now()
);

comment on table public.assistant_messages is
  'Saved AI conversations for signed-in people. Guests are never stored.';

create index if not exists assistant_messages_profile_idx
  on public.assistant_messages (profile_id, created_at);

create index if not exists assistant_messages_case_idx
  on public.assistant_messages (case_id, created_at);

alter table public.assistant_messages enable row level security;

-- A person reads their own conversation; everything is written by the
-- server with the service role, and staff read through it as well.
drop policy if exists "assistant_messages_select_own" on public.assistant_messages;
create policy "assistant_messages_select_own"
on public.assistant_messages for select
to authenticated
using (profile_id = auth.uid());
