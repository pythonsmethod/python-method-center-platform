-- Founder-only internal notification centre for Anham knowledge gaps.
--
-- When Anham honestly says it cannot confirm something and hands the question
-- on, that refusal is the only reliable signal that the centre's knowledge is
-- missing a piece. Nothing recorded it, so the same gap was answered with the
-- same apology indefinitely.
--
-- What is deliberately NOT stored here:
--
--   * the client's question, in whole or in part;
--   * any medical text, analysis value, symptom or diagnosis;
--   * the profile, case, email, IP or any other identifier of the person who
--     asked.
--
-- An event carries an enumerated topic, the audience family, the enumerated
-- escalation target and the interface locale — nothing that can be traced back
-- to a person, and nothing that would turn this table into a second, weaker
-- copy of the clinical record. This mirrors the voice-diagnostics decision:
-- enumerated codes only, never the speech itself.
--
-- The centre is internal. It sends no Telegram message, no email and no other
-- external notification; the founder reads it in the workspace.

create table public.assistant_gap_events (
  id uuid primary key default gen_random_uuid(),
  -- Enumerated, non-clinical subject areas. 'medical_review' records only
  -- that a question belonged to Professor Python's domain, never its content.
  topic text not null check (topic in (
    'service_scope',
    'pricing_and_plans',
    'payment_or_refund',
    'access_or_account',
    'documents_and_uploads',
    'schedule_and_timing',
    'methodology',
    'medical_review',
    'unclassified'
  )),
  audience text not null check (audience in ('client', 'staff')),
  escalation_target text not null
    check (escalation_target in ('karen', 'support', 'team', 'clarify')),
  locale text not null check (locale in ('ru', 'en')),
  -- The inactive knowledge draft opened for this gap, if one was opened.
  knowledge_draft_id uuid references public.assistant_knowledge (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.assistant_gap_events is
  'Append-only founder-only record that Anham could not answer from available knowledge. Enumerated topic/audience/target/locale only: no question text, no medical data, no client identifier. Service role only; no update or delete grant.';

create index assistant_gap_events_recent_idx
  on public.assistant_gap_events (created_at desc);

create index assistant_gap_events_topic_idx
  on public.assistant_gap_events (topic, created_at desc);

alter table public.assistant_gap_events enable row level security;
revoke all on table public.assistant_gap_events from public, anon, authenticated;
-- The service role is revoked before it is granted, and this is not
-- redundant. This project carries an ALTER DEFAULT PRIVILEGES for schema
-- public that grants ALL on every new table to anon, authenticated and
-- service_role. A bare `grant select, insert` therefore adds nothing and
-- silently leaves UPDATE, DELETE and TRUNCATE in place — which would make
-- this table append-only in intention only. Revoke first, then grant exactly
-- what is wanted.
revoke all on table public.assistant_gap_events from service_role;
-- Deliberately no update and no delete: an archived gap event is audit
-- material and stays exactly as it was written.
grant select, insert on table public.assistant_gap_events to service_role;

-- Read state, one row per founder per event, so two founders never consume
-- each other's unread list. Marking an event unread again deletes the row.
create table public.assistant_gap_reads (
  id uuid primary key default gen_random_uuid(),
  gap_event_id uuid not null
    references public.assistant_gap_events (id) on delete cascade,
  founder_profile_id uuid not null
    references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint assistant_gap_reads_event_founder_key
    unique (gap_event_id, founder_profile_id)
);

comment on table public.assistant_gap_reads is
  'Per-founder read marks for assistant_gap_events. Independent between founders; unique per (event, founder). Service role only.';

create index assistant_gap_reads_founder_idx
  on public.assistant_gap_reads (founder_profile_id, gap_event_id);

alter table public.assistant_gap_reads enable row level security;
revoke all on table public.assistant_gap_reads from public, anon, authenticated;
-- Same reason as above: strip the default-privilege grant, then restore only
-- what the read marks need. No UPDATE — a mark is created or removed, never
-- edited in place.
revoke all on table public.assistant_gap_reads from service_role;
grant select, insert, delete on table public.assistant_gap_reads to service_role;

-- Unread counter for one founder. Server-side only: the workspace badge is
-- rendered by a founder-gated route, never by a browser calling this directly.
create function public.assistant_gap_unread_count(p_founder_profile_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.assistant_gap_events as event
  where not exists (
    select 1
    from public.assistant_gap_reads as mark
    where mark.gap_event_id = event.id
      and mark.founder_profile_id = p_founder_profile_id
  );
$$;

revoke all on function public.assistant_gap_unread_count(uuid)
  from public, anon, authenticated;
grant execute on function public.assistant_gap_unread_count(uuid) to service_role;
