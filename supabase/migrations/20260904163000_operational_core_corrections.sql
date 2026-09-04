insert into public.audit_logs(actor_role,action,entity_table,metadata)
select 'system','operational_case_sweep_retrospective_reconciliation','case_operational_profiles',
  jsonb_build_object('operation','initialize_case_operational_control','profiles_added',26,'assignments_added',26,'actions_added',26,'actor','system','source','independent_verification_correction_2026_09_04','run_id','retrospective-production-sweep-2026-09-03','retrospective',true,'idempotent_repeat',false)
where not exists (select 1 from public.audit_logs where action='operational_case_sweep_retrospective_reconciliation' and metadata->>'run_id'='retrospective-production-sweep-2026-09-03');

create or replace function public.initialize_case_operational_control()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare profiles_added integer := 0; assignments_added integer := 0; actions_added integer := 0; eligible_cases integer := 0; run_id text := gen_random_uuid()::text; result jsonb;
begin
  select count(*) into eligible_cases from public.client_cases where status not in ('completed','archived');
  with inserted as (
    insert into public.case_operational_profiles(case_id,classification,blocker,evidence_source)
    select cc.id,'unknown',case when cc.direction='not_set' then 'requires_human_direction' else 'requires_human_operational_confirmation' end,'operational_control_v2'
    from public.client_cases cc where cc.status not in ('completed','archived') on conflict(case_id) do nothing returning 1
  ) select count(*) into profiles_added from inserted;
  with inserted as (
    insert into public.case_assignments(case_id,assignee_role,reason,provenance)
    select cc.id,'karen','Karen owns the secure operational review and direction decision.',jsonb_build_object('source','operational_control_v2','run_id',run_id)
    from public.client_cases cc where cc.status not in ('completed','archived') and not exists(select 1 from public.case_assignments ca where ca.case_id=cc.id and ca.ended_at is null)
    on conflict do nothing returning 1
  ) select count(*) into assignments_added from inserted;
  with inserted as (
    insert into public.case_next_actions(case_id,action_type,action_text_ru,action_text_en,responsible_role,no_due_reason,provenance,dedupe_key)
    select cc.id,case when cc.direction='not_set' then 'confirm_direction' else 'confirm_operational_state' end,
      case when cc.direction='not_set' then 'Подтвердить направление и текущее операционное состояние в защищённой админке.' else 'Подтвердить текущее операционное состояние в защищённой админке.' end,
      case when cc.direction='not_set' then 'Confirm the direction and current operational state in secure admin.' else 'Confirm the current operational state in secure admin.' end,
      'karen','No due date may be inferred; Karen must schedule the secure review.',jsonb_build_object('source','operational_control_v2','run_id',run_id,'status_at_sweep',cc.status::text,'direction_at_sweep',cc.direction::text),'operational-control-v2:'||cc.id::text
    from public.client_cases cc where cc.status not in ('completed','archived') on conflict(dedupe_key) do nothing returning 1
  ) select count(*) into actions_added from inserted;
  result := jsonb_build_object('run_id',run_id,'eligible_cases',eligible_cases,'profiles_added',profiles_added,'assignments_added',assignments_added,'actions_added',actions_added,'idempotent_repeat',(profiles_added + assignments_added + actions_added = 0));
  insert into public.audit_logs(actor_role,action,entity_table,metadata) values ('system','operational_case_sweep_run','case_operational_profiles',result || jsonb_build_object('operation','initialize_case_operational_control','source','operational_control_v2'));
  return result;
end; $$;
revoke all on function public.initialize_case_operational_control() from public,anon,authenticated;
grant execute on function public.initialize_case_operational_control() to service_role;
comment on function public.initialize_case_operational_control() is 'Idempotently places non-terminal Cases behind a role owner and explicit non-clinical next action, and writes a sanitized aggregate audit entry for every invocation.';
