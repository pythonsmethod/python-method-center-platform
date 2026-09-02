-- One measurement, as printed and as the centre reads it.
--
-- This is where Module 1 of the analysis specification actually lands. The
-- resolver works out which unit a number was printed in; without somewhere
-- to put that work, every later stage would have to redo it, and two runs
-- over the same document could reach two answers with nothing to show which
-- came first.
--
-- Not the same thing as `health_metrics`, and deliberately a separate
-- table. Those rows are the person's own chart: they type them, edit them
-- and delete them, and the platform never reads a document to fill them in.
-- These rows are facts recovered from a laboratory form by the pipeline,
-- and a safety screen must not rest on a number the reader can quietly
-- change or remove.
--
-- Every column of the specification's "обязательные поля" table is here,
-- and the original half is stored exactly as printed: `value_original`,
-- `unit_original` and `reference_original` are what the person sees on
-- their own paper, and nothing is allowed to overwrite them with the
-- centre's own arithmetic.

create table if not exists public.lab_values (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  document_id uuid references public.uploaded_documents(id) on delete set null,

  -- The date the sample was taken, as printed on the form. Null when the
  -- form does not say: a guessed date would put a value in the wrong place
  -- in a trend, which is worse than an unplaced value.
  measured_on date,

  -- The caption exactly as printed, kept whether or not it was recognised.
  -- A row whose caption nobody has taught the dictionary is still a row: it
  -- goes to a person, and the caption is what they need to see.
  label_original text not null,
  -- The analyte code, once the caption is recognised. Null means the
  -- caption was not in the dictionary — never that it was guessed.
  analyte text,

  value_original numeric not null,
  unit_original text,
  reference_original text,
  reference_low numeric,
  reference_high numeric,

  unit_resolved text,
  unit_resolution_method text not null check (unit_resolution_method in (
    'explicit', 'resolved_by_reference', 'resolved_by_locale', 'unresolved'
  )),
  value_canonical numeric,
  -- Null for a conversion that is not a multiplication: IFCC to NGSP is a
  -- formula, and recording some number here would invite multiplying by it.
  conversion_factor numeric,
  -- (value − ref_low) / (ref_high − ref_low). The only quantity comparable
  -- between countries: two ferritins of 43 are the same number and
  -- different states, and this is the difference.
  position_in_reference numeric,
  -- Why nothing could be resolved, in words the person settling it can act
  -- on. Required exactly when the method is 'unresolved'.
  unresolved_reason text,

  -- Which edition of the reference tables produced the resolved half. When
  -- an answer changes, the first question is always whether the code
  -- changed or the tables underneath it did.
  reference_set_version text not null,

  created_at timestamptz not null default now(),

  -- "unresolved не проходит молча ни на одном пути" — as a constraint
  -- rather than as a rule somebody has to remember. An unresolved row
  -- cannot carry a canonical number that a later stage might compare
  -- against a threshold, and a resolved one cannot arrive without the unit
  -- it was resolved to.
  constraint lab_values_resolution_is_honest check (
    case
      when unit_resolution_method = 'unresolved'
        then unit_resolved is null
          and value_canonical is null
          and conversion_factor is null
          and unresolved_reason is not null
      else unit_resolved is not null
        and value_canonical is not null
        and unresolved_reason is null
    end
  )
);

comment on table public.lab_values is
  'One measurement recovered from a laboratory document: the original as printed, and the centre''s canonical reading beside it. Pipeline-owned — clients read their own rows and never write them.';

comment on column public.lab_values.position_in_reference is
  'Where the value sits inside its own laboratory''s interval: 0 at the lower bound, 1 at the upper, outside those bounds beyond them. The only quantity comparable between laboratories and countries.';

comment on constraint lab_values_resolution_is_honest on public.lab_values is
  'An unresolved measurement may not carry a canonical value, and a resolved one may not arrive without its unit. The specification requires that unresolved never passes silently; this makes it impossible rather than forbidden.';

create index if not exists lab_values_profile_analyte_idx
  on public.lab_values (profile_id, analyte, measured_on desc);

create index if not exists lab_values_document_idx
  on public.lab_values (document_id);

-- The unresolved rows, which are a work queue for a person rather than a
-- rare error: partial index because they are the small minority that has to
-- be found quickly.
create index if not exists lab_values_unresolved_idx
  on public.lab_values (profile_id, created_at desc)
  where unit_resolution_method = 'unresolved' or analyte is null;

alter table public.lab_values enable row level security;

-- The person may read their own measurements. They may not write them:
-- these are read off a document by the pipeline, and a value a safety
-- screen consults must not be editable by the person it is about. The
-- pipeline and the staff use the service client, as they do for every other
-- durable case record.
drop policy if exists "lab_values_select_own" on public.lab_values;
create policy "lab_values_select_own"
on public.lab_values for select
to authenticated
using (profile_id = auth.uid());
