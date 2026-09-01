-- The health questionnaire: the picture a person gives of themselves.
--
-- Analyses on their own do not describe a person. Numbers can sit inside
-- every reference interval while the person filling the form is barely
-- able to climb the stairs, and they can sit outside one for a reason the
-- laboratory cannot see — a pregnancy, an operation last spring, a
-- medicine taken this morning. The questionnaire is the half of the
-- picture the laboratory never prints, and without it the numbers get
-- read as if they belonged to nobody.
--
-- Every save is a new row. A person adds to this picture, corrects it and
-- changes it for as long as they are with the centre, and none of that may
-- overwrite what they said before: whether a complaint is new this month
-- is a clinical fact in itself, and it exists only if the earlier answer
-- was kept. So the current questionnaire is not a row that gets updated —
-- it is the newest row, and the ones behind it are the history. The
-- structure holds that guarantee, not anybody's discipline: there is no
-- update policy for the client, and the trigger below refuses an update
-- from any connection at all, service role included.
--
-- Deletion is deliberately left alone. Erasing an account has to erase
-- these rows with it, and a table that cannot be deleted from would quietly
-- break the retention policy.

create table if not exists public.health_questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- What barely changes. Kept on every version anyway, because a version
  -- is a whole picture as of a date, not a patch against the one before:
  -- reading a single row must never require replaying the rows behind it.
  birth_date date,
  sex text check (sex in ('female', 'male', 'unspecified')),

  -- What changes slowly. Height is here beside weight on purpose — one of
  -- them moves and the other does not, and the pair is what makes either
  -- worth anything.
  height_cm numeric(4,1) check (height_cm between 30 and 260),
  weight_kg numeric(5,1) check (weight_kg between 2 and 400),

  -- What the person came here about. Asked first and answered in their own
  -- words: a complaint sorted into somebody's checkbox has already lost
  -- the part that mattered.
  complaints text,

  chronic_conditions text,
  surgeries text,
  allergies text,
  habits text,

  -- Asked because the same number means different things beside them, and
  -- both are ordinary states rather than diagnoses.
  pregnancy_status text check (pregnancy_status in (
    'not_applicable', 'no', 'pregnant', 'breastfeeding', 'planning'
  )),
  cycle_status text check (cycle_status in (
    'not_applicable', 'regular', 'irregular', 'absent', 'menopause'
  )),
  cycle_note text,

  -- The person's own account of the whole picture, in their own words and
  -- their own order.
  --
  -- This is not a spare field for whatever the structured questions missed.
  -- A standard questionnaire does not fit everybody, and the things that
  -- turn out to matter most are usually the ones nobody thought to print a
  -- box for. What a person writes here is read as evidence, not as
  -- decoration around the fields above.
  self_description text,

  created_at timestamptz not null default now()
);

comment on table public.health_questionnaire_versions is
  'The client''s own account of their health. Append-only: every save is a new version and the current questionnaire is the newest row, so the history of what a person said and when is never lost.';

comment on column public.health_questionnaire_versions.self_description is
  'The person''s free description of their whole picture. Read as evidence, not as a remark beside the structured fields.';

create index if not exists health_questionnaire_versions_profile_idx
  on public.health_questionnaire_versions (profile_id, created_at desc);

-- A written version is final. Corrections are made by writing the next one,
-- which is what makes "this complaint is new since June" a fact the record
-- can actually support.
-- Deliberately not SECURITY DEFINER: the function only raises, so it needs
-- no privileges of its own, and a definer function in the public schema is
-- reachable over the REST API as an RPC. Execute is revoked as well, so it
-- is callable only as the trigger it is.
create or replace function public.health_questionnaire_versions_are_final()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'health_questionnaire_versions is append-only: save a new version instead of changing %', old.id;
end;
$$;

drop trigger if exists health_questionnaire_versions_no_update
  on public.health_questionnaire_versions;
create trigger health_questionnaire_versions_no_update
before update on public.health_questionnaire_versions
for each row
execute function public.health_questionnaire_versions_are_final();

revoke all on function public.health_questionnaire_versions_are_final() from public, anon, authenticated;

comment on function public.health_questionnaire_versions_are_final() is
  'Refuses any update to a saved questionnaire version, from any connection including the service role. History is kept by structure, not by convention.';

alter table public.health_questionnaire_versions enable row level security;

drop policy if exists "health_questionnaire_versions_select_own"
  on public.health_questionnaire_versions;
create policy "health_questionnaire_versions_select_own"
on public.health_questionnaire_versions for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "health_questionnaire_versions_insert_own"
  on public.health_questionnaire_versions;
create policy "health_questionnaire_versions_insert_own"
on public.health_questionnaire_versions for insert
to authenticated
with check (profile_id = auth.uid());

-- No update policy and no delete policy for the client, deliberately. The
-- staff read these rows through the service client the same way they read
-- every other client-owned table.
