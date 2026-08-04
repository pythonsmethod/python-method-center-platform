-- Two free care tools for every registered person.
--
-- 1) health_metrics — the person's own lab values over time, entered by
--    the person (the platform never invents numbers and does not read
--    storage files). The chart on /cabinet/metrics is drawn from these
--    rows and nothing else.
-- 2) supplements + supplement_intakes — what the person takes and when,
--    with a daily check-off. The person decides what to enter; the AI only
--    helps arrange times; Professor Python owns any real recommendation.
--
-- All three tables are the person's own data: unlike case decisions,
-- they are client-owned, so clients may insert, update and delete their
-- own rows directly under RLS.

create table if not exists public.health_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Free-form but trimmed/collapsed on write: "Гемоглобин", "Ферритин".
  metric_name text not null,
  value numeric not null,
  unit text,
  measured_at date not null,
  created_at timestamptz not null default now()
);

comment on table public.health_metrics is
  'Client-entered lab values for the dynamics chart. The platform never generates these numbers itself.';

create index if not exists health_metrics_profile_idx
  on public.health_metrics (profile_id, metric_name, measured_at);

alter table public.health_metrics enable row level security;

drop policy if exists "health_metrics_select_own" on public.health_metrics;
create policy "health_metrics_select_own"
on public.health_metrics for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "health_metrics_insert_own" on public.health_metrics;
create policy "health_metrics_insert_own"
on public.health_metrics for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "health_metrics_delete_own" on public.health_metrics;
create policy "health_metrics_delete_own"
on public.health_metrics for delete
to authenticated
using (profile_id = auth.uid());

create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  dose text,
  -- Times of day as "HH:MM" strings, e.g. ["08:00","20:00"].
  times jsonb not null default '[]'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.supplements is
  'Client-entered supplement schedule. What to take is the client''s and Professor Python''s decision — never the AI''s.';

create index if not exists supplements_profile_idx
  on public.supplements (profile_id, is_active);

alter table public.supplements enable row level security;

drop policy if exists "supplements_select_own" on public.supplements;
create policy "supplements_select_own"
on public.supplements for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "supplements_insert_own" on public.supplements;
create policy "supplements_insert_own"
on public.supplements for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "supplements_update_own" on public.supplements;
create policy "supplements_update_own"
on public.supplements for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "supplements_delete_own" on public.supplements;
create policy "supplements_delete_own"
on public.supplements for delete
to authenticated
using (profile_id = auth.uid());

-- One check-off per supplement, per day, per time slot.
create table if not exists public.supplement_intakes (
  id uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  taken_on date not null,
  time_slot text not null,
  taken_at timestamptz not null default now(),
  constraint supplement_intakes_unique unique (supplement_id, taken_on, time_slot)
);

comment on table public.supplement_intakes is
  'Daily check-offs of the supplement schedule.';

create index if not exists supplement_intakes_profile_day_idx
  on public.supplement_intakes (profile_id, taken_on);

alter table public.supplement_intakes enable row level security;

drop policy if exists "supplement_intakes_select_own" on public.supplement_intakes;
create policy "supplement_intakes_select_own"
on public.supplement_intakes for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "supplement_intakes_insert_own" on public.supplement_intakes;
create policy "supplement_intakes_insert_own"
on public.supplement_intakes for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "supplement_intakes_delete_own" on public.supplement_intakes;
create policy "supplement_intakes_delete_own"
on public.supplement_intakes for delete
to authenticated
using (profile_id = auth.uid());
