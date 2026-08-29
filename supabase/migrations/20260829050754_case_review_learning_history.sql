-- Immutable training history for Professor Python's review decisions.
-- The current AI draft remains in case_ai_reviews; every human approval is
-- appended here so later research can compare machine output with Karen's
-- reasoning without reconstructing it from chat messages.
create table if not exists public.case_review_learning_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  review_id uuid not null references public.case_ai_reviews(id) on delete cascade,
  ai_draft text not null,
  approved_text text not null,
  edit_operations jsonb not null default '[]'::jsonb,
  removed_fragments text[] not null default '{}',
  added_fragments text[] not null default '{}',
  documents_fingerprint text not null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz not null default now(),
  constraint case_review_learning_ai_draft_length check (char_length(ai_draft) between 1 and 8000),
  constraint case_review_learning_approved_length check (char_length(approved_text) between 1 and 8000)
);

comment on table public.case_review_learning_events is
  'Immutable pairs of AI draft and Professor Python-approved conclusion, including exact additions and removals, for learning the method across cases.';

create index if not exists case_review_learning_case_idx
  on public.case_review_learning_events (case_id, approved_at desc);
create index if not exists case_review_learning_review_idx
  on public.case_review_learning_events (review_id, approved_at desc);

alter table public.case_review_learning_events enable row level security;
revoke all on public.case_review_learning_events from anon, authenticated;
