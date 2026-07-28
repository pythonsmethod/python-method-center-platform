-- Assistant abuse protection.
--
-- The public assistant is open to strangers, which makes it the one place
-- on the platform where a coordinated raid ("brigading") can cost real
-- money: a few hundred people writing nonsense to the AI at once. This
-- table is the shared counter that survives serverless instances, so the
-- caps below are real caps and not a per-instance guess.
--
-- Two kinds of buckets are counted per UTC day:
--   'v:<sha256 of ip + salt>' — one visitor
--   'total:guest'             — every guest of the platform together
-- Raw IP addresses are never stored: only a salted hash, which is enough
-- to count and useless as personal data.

create table if not exists public.assistant_usage (
  bucket_key text not null,
  window_date date not null default (now() at time zone 'utc')::date,
  message_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_date)
);

comment on table public.assistant_usage is
  'Daily message counters for the public AI assistant: per visitor (hashed) and platform-wide. Protects the budget from coordinated abuse.';

create index if not exists assistant_usage_window_idx
  on public.assistant_usage (window_date desc);

alter table public.assistant_usage enable row level security;

-- No policies on purpose: only the service role (server) touches this table.

-- Atomic count-and-check in one round trip. Returns how many messages this
-- bucket has used today and whether the caller is still within the limit.
create or replace function public.bump_assistant_usage(
  p_bucket_key text,
  p_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  insert into public.assistant_usage (bucket_key, window_date, message_count)
  values (p_bucket_key, (now() at time zone 'utc')::date, 1)
  on conflict (bucket_key, window_date)
  do update set
    message_count = public.assistant_usage.message_count + 1,
    updated_at = now()
  returning public.assistant_usage.message_count into v_used;

  return query select v_used <= p_limit, v_used;
end;
$$;

revoke all on function public.bump_assistant_usage(text, integer) from public;
revoke all on function public.bump_assistant_usage(text, integer) from anon;
revoke all on function public.bump_assistant_usage(text, integer) from authenticated;

-- Housekeeping: the counters are only interesting for the current day and
-- a short history, so old rows can be dropped safely.
create or replace function public.purge_assistant_usage()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.assistant_usage
  where window_date < (now() at time zone 'utc')::date - interval '30 days';
$$;
