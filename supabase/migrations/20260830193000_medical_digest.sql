create table if not exists public.medical_digest_issues (
  id uuid primary key default gen_random_uuid(),
  issue_date date not null unique,
  generated_at timestamptz not null default now(),
  source_count integer not null default 0 check (source_count >= 0),
  articles jsonb not null default '[]'::jsonb check (jsonb_typeof(articles) = 'array'),
  created_at timestamptz not null default now()
);

create index if not exists medical_digest_issues_date_idx
  on public.medical_digest_issues(issue_date desc);

alter table public.medical_digest_issues enable row level security;
revoke all on table public.medical_digest_issues from anon, authenticated;
grant select, insert, update, delete on table public.medical_digest_issues to service_role;

comment on table public.medical_digest_issues is
  'Daily staff-only medical literature digests generated from linked primary-source records.';

