create table if not exists public.care_recipients (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.client_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('adult', 'minor')),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  birth_date date,
  relationship_to_client text not null check (char_length(trim(relationship_to_client)) between 2 and 80),
  client_role_for_recipient text not null check (char_length(trim(client_role_for_recipient)) between 2 and 80),
  country text,
  reason_for_representation text not null check (char_length(trim(reason_for_representation)) between 2 and 600),
  representative_confirmed boolean not null default false,
  data_processing_consent boolean not null default false,
  responsibility_acknowledged boolean not null default false,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.care_recipients is 'Case patient when the patient differs from the authenticated account owner.';
create index if not exists care_recipients_profile_id_idx on public.care_recipients(profile_id);
alter table public.care_recipients enable row level security;
do $$ begin create policy "care_recipients_select_own" on public.care_recipients for select using (auth.uid() = profile_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "care_recipients_insert_own" on public.care_recipients for insert with check (auth.uid() = profile_id and exists (select 1 from public.client_cases c where c.id = case_id and c.profile_id = auth.uid())); exception when duplicate_object then null; end $$;
do $$ begin create policy "care_recipients_update_own" on public.care_recipients for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id and exists (select 1 from public.client_cases c where c.id = case_id and c.profile_id = auth.uid())); exception when duplicate_object then null; end $$;
drop trigger if exists set_care_recipients_updated_at on public.care_recipients;
create trigger set_care_recipients_updated_at before update on public.care_recipients for each row execute function public.set_updated_at();
