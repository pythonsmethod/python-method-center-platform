-- Referral program: every client gets a personal token (code) they can
-- share. A visitor who arrives with ?ref=CODE and then registers is
-- attributed to the referrer.

-- 1) Personal referral token on the profile.
alter table public.profiles
  add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

comment on column public.profiles.referral_code is
  'Personal referral token shared by the client (format PM-XXXXXX). Generated lazily on first view of the cabinet.';

-- 2) Attribution: one row per referred person, created at sign-up.
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.profiles(id) on delete cascade,
  referred_profile_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A person can be attributed to exactly one referrer, once.
  constraint referrals_referred_unique unique (referred_profile_id),
  -- Self-referral is meaningless and would inflate stats.
  constraint referrals_no_self check (referrer_profile_id <> referred_profile_id)
);

comment on table public.referrals is
  'Referral attribution: who invited whom. Conversion status is derived from cases and payments, not stored here.';

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_profile_id, created_at desc);

create trigger set_referrals_updated_at
before update on public.referrals
for each row execute function public.set_updated_at();

alter table public.referrals enable row level security;

-- Clients may read the rows where they are the referrer (their own
-- invitees). Writes happen through the server-only service role.
create policy "referrals_select_own"
on public.referrals for select
to authenticated
using (referrer_profile_id = auth.uid());
