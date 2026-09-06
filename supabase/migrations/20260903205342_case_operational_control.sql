-- Server-only operational control. These records contain no medical
-- interpretation; they answer who owns the next administrative step and
-- why the case cannot safely advance automatically.

create table if not exists public.case_operational_profiles (
  case_id uuid primary key references public.client_cases(id) on delete cascade,
  classification text not null default 'unknown'
    check (classification in ('real','test','duplicate','incomplete','abandoned','unknown')),
  blocker text,
  evidence_source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  assignee_role public.actor_role not null,
  assignee_profile_id uuid references public.profiles(id) on delete restrict,
  assigned_by uuid references public.profiles(id) on delete set null,
  reason text not null,
  provenance jsonb not null default '{}'::jsonb,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  check (assignee_role <> 'client')
);

create unique index if not exists case_assignments_one_current_idx
  on public.case_assignments(case_id) where ended_at is null;
create index if not exists case_assignments_profile_idx
  on public.case_assignments(assignee_profile_id) where ended_at is null;

create table if not exists public.case_next_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.client_cases(id) on delete cascade,
  action_type text not null,
  action_text_ru text not null,
  action_text_en text not null,
  responsible_role public.actor_role not null,
  responsible_profile_id uuid references public.profiles(id) on delete restrict,
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  due_at timestamptz,
  no_due_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  completion_note text,
  provenance jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (responsible_role <> 'client'),
  check (due_at is not null or no_due_reason is not null),
  check ((status = 'completed') = (completed_at is not null))
);

create index if not exists case_next_actions_case_status_idx
  on public.case_next_actions(case_id,status,created_at desc);
create index if not exists case_next_actions_responsible_idx
  on public.case_next_actions(responsible_profile_id,status,due_at);

alter table public.case_operational_profiles enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_next_actions enable row level security;
revoke all on public.case_operational_profiles from anon, authenticated;
revoke all on public.case_assignments from anon, authenticated;
revoke all on public.case_next_actions from anon, authenticated;

comment on table public.case_operational_profiles is
  'Server-only current operational classification/blocker; never a clinical direction or interpretation.';
comment on table public.case_assignments is
  'Server-only append-only ownership history. Clients cannot assign or reassign a case.';
comment on table public.case_next_actions is
  'Server-only administrative next actions, separate from medical recommendations.';

create or replace function public.initialize_case_operational_control()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare profiles_added integer := 0;
declare assignments_added integer := 0;
declare actions_added integer := 0;
begin
  with inserted as (
    insert into public.case_operational_profiles(case_id,classification,blocker,evidence_source)
    select cc.id,'unknown',
      case when cc.direction='not_set' then 'requires_human_direction' else 'requires_human_operational_confirmation' end,
      'production_operational_sweep_2026_09_03'
    from public.client_cases cc
    on conflict(case_id) do nothing returning 1
  ) select count(*) into profiles_added from inserted;

  with inserted as (
    insert into public.case_assignments(case_id,assignee_role,reason,provenance)
    select cc.id,'karen','Karen owns the secure operational review and direction decision.',
      jsonb_build_object('source','production_operational_sweep_2026_09_03')
    from public.client_cases cc
    where not exists(select 1 from public.case_assignments ca where ca.case_id=cc.id and ca.ended_at is null)
    on conflict do nothing returning 1
  ) select count(*) into assignments_added from inserted;

  with inserted as (
    insert into public.case_next_actions(
      case_id,action_type,action_text_ru,action_text_en,responsible_role,
      no_due_reason,provenance,dedupe_key
    )
    select cc.id,
      case when cc.direction='not_set' then 'confirm_direction' else 'confirm_operational_state' end,
      case when cc.direction='not_set' then 'Подтвердить направление и текущее операционное состояние в защищённой админке.' else 'Подтвердить текущее операционное состояние в защищённой админке.' end,
      case when cc.direction='not_set' then 'Confirm the direction and current operational state in secure admin.' else 'Confirm the current operational state in secure admin.' end,
      'karen','No due date may be inferred; Karen must schedule the secure review.',
      jsonb_build_object('source','production_operational_sweep_2026_09_03','status_at_sweep',cc.status::text,'direction_at_sweep',cc.direction::text),
      'operational-sweep-2026-09-03:'||cc.id::text
    from public.client_cases cc
    on conflict(dedupe_key) do nothing returning 1
  ) select count(*) into actions_added from inserted;

  return jsonb_build_object('profiles_added',profiles_added,'assignments_added',assignments_added,'actions_added',actions_added);
end;
$$;

revoke all on function public.initialize_case_operational_control() from public,anon,authenticated;
grant execute on function public.initialize_case_operational_control() to service_role;

comment on function public.initialize_case_operational_control() is
  'Idempotently places every Case behind a named role owner and explicit non-clinical next action without guessing direction or status.';
