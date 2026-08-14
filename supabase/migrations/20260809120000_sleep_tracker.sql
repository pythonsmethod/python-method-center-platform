-- Sleep tracker — the third free care tool, next to the metrics chart and
-- the supplement checklist.
--
-- One row per night, owned by the person like the other two tools: they may
-- insert, update and delete their own rows under RLS, and nobody's rows are
-- visible to anybody else.
--
-- `source` is the whole reason this table is shaped the way it is. A night
-- may arrive typed by hand or imported from a watch, a ring or a bracelet,
-- and later — when a device integration is actually approved and tested —
-- from the device itself. Recording where a night came from now means that
-- day changes nothing here: a new source is a new value, not a new table.
--
-- The night is filed under the date the person WOKE UP, which is what every
-- device does. `sleep_entries_night_unique` then means what it should: one
-- night, one row, whether it was typed twice or imported twice.

create table if not exists public.sleep_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- The morning of waking. "Ночь на 9 августа" is stored as 2026-08-09.
  slept_on date not null,
  -- "HH:MM" local to the person; kept as text on purpose, the same way the
  -- supplement schedule keeps its times. Both may be null: an imported
  -- night sometimes carries only a duration.
  bedtime text,
  wake_time text,
  duration_minutes integer check (duration_minutes between 0 and 1440),
  -- How the person felt, 1 to 5. Their own judgement, not a device score:
  -- the number a person gives their own night is the one Professor Python
  -- actually needs.
  quality smallint check (quality between 1 and 5),
  awakenings smallint check (awakenings between 0 and 50),
  note text,
  source text not null default 'manual',
  -- Which watch, ring or bracelet the night came from, as the person named
  -- it. Free text: there is no list of devices that stays correct.
  device text,
  -- The device's own id for this night, when an import provides one.
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_entries_night_unique unique (profile_id, slept_on)
);

comment on table public.sleep_entries is
  'Client-owned sleep log: one row per night, typed by the person or imported from their device. The platform never invents a night.';

create index if not exists sleep_entries_profile_night_idx
  on public.sleep_entries (profile_id, slept_on desc);

alter table public.sleep_entries enable row level security;

drop policy if exists "sleep_entries_select_own" on public.sleep_entries;
create policy "sleep_entries_select_own"
on public.sleep_entries for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "sleep_entries_insert_own" on public.sleep_entries;
create policy "sleep_entries_insert_own"
on public.sleep_entries for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "sleep_entries_update_own" on public.sleep_entries;
create policy "sleep_entries_update_own"
on public.sleep_entries for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "sleep_entries_delete_own" on public.sleep_entries;
create policy "sleep_entries_delete_own"
on public.sleep_entries for delete
to authenticated
using (profile_id = auth.uid());

-- Karen's own sleep guidance.
--
-- It is not a new kind of content and does not get a new table: he already
-- writes what the AI must know in the knowledge base, in the admin
-- workspace. A topic lets the same entry do two jobs — be shown to the
-- person on the sleep page in his own words, and ground the assistant so it
-- can never advise something the author of the method did not say.
alter table public.assistant_knowledge
  add column if not exists topic text not null default 'general';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assistant_knowledge_topic_check'
  ) then
    alter table public.assistant_knowledge
      add constraint assistant_knowledge_topic_check
      check (topic in ('general', 'sleep'));
  end if;
end $$;

comment on column public.assistant_knowledge.topic is
  'Where the entry belongs. "sleep" entries are also shown to clients on the sleep page as Professor Python''s own words.';

create index if not exists assistant_knowledge_topic_idx
  on public.assistant_knowledge (topic, is_active, audience);
