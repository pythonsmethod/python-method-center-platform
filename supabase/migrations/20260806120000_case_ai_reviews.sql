-- The assistant's reading of a case's own analyses, kept once it is made.
--
-- Professor Python opens a case many times a day. Reading four photographed
-- lab forms costs seconds and money every single time, so the reading is
-- done once, stored here, and shown instantly on every later visit. When
-- the client uploads something new, the fingerprint stops matching and the
-- panel says the reading is out of date.
--
-- Two fields because there are two audiences and they must never be
-- confused with one another:
--   summary — for Professor Python. It is the machine's opinion, labelled
--             as such wherever it is shown, and it may interpret.
--   draft   — a proposed reply to the client, which he copies into the
--             message box, edits, and sends himself. Nothing here reaches
--             a client on its own.
--
-- Staff-only, written by the service role: RLS is enabled with no policy,
-- so anon and authenticated cannot read it at all. A client must never be
-- able to fetch the machine's opinion about their own analyses.

create table if not exists public.case_ai_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  -- The assistant's reading, for the team's eyes.
  summary text not null,
  -- The proposed reply, for Professor Python to take, change and send.
  draft text not null,
  -- Which documents were read: ids and their timestamps, joined. When the
  -- case's documents no longer produce this string, the reading is stale.
  documents_fingerprint text not null,
  documents_count integer not null default 0,
  -- Who asked for it.
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.case_ai_reviews is
  'AI reading of a case''s uploaded analyses. Team-only. The draft reply is never sent automatically — Professor Python copies it, edits it and sends it himself.';

-- One current reading per case: a new one replaces the old.
create unique index if not exists case_ai_reviews_case_idx
  on public.case_ai_reviews (case_id);

alter table public.case_ai_reviews enable row level security;
