-- Canonical, idempotent maintenance operation for deterministic service
-- period expiry. This table remains server-only: RLS is enabled and no
-- anon/authenticated policies or grants are created.

create unique index if not exists case_lifecycle_service_period_completed_key
  on public.case_lifecycle_events ((metadata ->> 'service_period_id'))
  where event_type = 'service_period_completed'
    and metadata ? 'service_period_id';

create or replace function public.run_operational_maintenance(
  maintenance_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expired_count integer := 0;
  lifecycle_count integer := 0;
  case_count integer := 0;
begin
  -- Lock and complete only periods that are still active and have actually
  -- elapsed. A future renewal is never touched merely because an older
  -- period for the same case elapsed.
  with expired as (
    update public.service_periods sp
       set status = 'completed', updated_at = maintenance_now
     where sp.status = 'active'
       and sp.ends_at is not null
       and sp.ends_at <= maintenance_now
     returning sp.id, sp.profile_id, sp.case_id, sp.product, sp.ends_at
  ), audited as (
    insert into public.case_lifecycle_events (
      profile_id, case_id, event_type, actor_role, notes, metadata,
      created_at, updated_at
    )
    select
      e.profile_id,
      e.case_id,
      'service_period_completed',
      'system',
      'Service period completed by authenticated operational maintenance.',
      jsonb_build_object(
        'service_period_id', e.id::text,
        'product', e.product::text,
        'ended_at', e.ends_at,
        'source', 'operational_maintenance'
      ),
      maintenance_now,
      maintenance_now
    from expired e
    on conflict ((metadata ->> 'service_period_id'))
      where event_type = 'service_period_completed'
        and metadata ? 'service_period_id'
      do nothing
    returning case_id
  )
  select
    (select count(*) from expired),
    (select count(*) from audited)
  into expired_count, lifecycle_count;

  -- Case is durable; only align an explicitly active-support case when no
  -- later active or scheduled entitlement exists. Other case states are
  -- never inferred from payment dates.
  with candidates as (
    select distinct cle.case_id
    from public.case_lifecycle_events cle
    where cle.event_type = 'service_period_completed'
      and cle.created_at = maintenance_now
  ), changed as (
    update public.client_cases cc
       set status = 'inactive_support', updated_at = maintenance_now
      from candidates c
     where cc.id = c.case_id
       and cc.status = 'active_support'
       and not exists (
         select 1
         from public.service_periods later
         where later.case_id = cc.id
           and later.status in ('active', 'scheduled')
           and coalesce(later.ends_at, 'infinity'::timestamptz) > maintenance_now
       )
    returning cc.id, cc.profile_id
  ), audited as (
    insert into public.case_lifecycle_events (
      profile_id, case_id, event_type, from_status, to_status,
      actor_role, notes, metadata, created_at, updated_at
    )
    select
      c.profile_id, c.id, 'status_changed', 'active_support',
      'inactive_support', 'system',
      'No later active or scheduled service period remains.',
      jsonb_build_object('source', 'operational_maintenance'),
      maintenance_now, maintenance_now
    from changed c
    returning 1
  )
  select count(*) into case_count from audited;

  return jsonb_build_object(
    'expired_periods', expired_count,
    'lifecycle_events', lifecycle_count,
    'cases_aligned', case_count
  );
end;
$$;

revoke all on function public.run_operational_maintenance(timestamptz)
  from public, anon, authenticated;
grant execute on function public.run_operational_maintenance(timestamptz)
  to service_role;

comment on function public.run_operational_maintenance(timestamptz) is
  'Service-role-only, idempotent expiry of elapsed support periods with lifecycle audit and conservative case-state alignment.';
