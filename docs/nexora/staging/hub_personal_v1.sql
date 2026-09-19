-- STAGING ONLY. Requires the existing HCS baseline; not an automatic production migration.
create table if not exists public.hcs_hub_settings (profile_id uuid primary key references public.profiles(id) on delete cascade,branch_urls jsonb not null default '{}'::jsonb check(jsonb_typeof(branch_urls)='object'),updated_at timestamptz not null default now());
create table if not exists public.hcs_hub_quotas (profile_id uuid not null references public.profiles(id) on delete cascade,action text not null check(action in ('chat','transcribe')),window_start timestamptz not null,uses integer not null default 0 check(uses>=0),primary key(profile_id,action,window_start));
alter table public.hcs_hub_settings enable row level security;
alter table public.hcs_hub_quotas enable row level security;
revoke all on public.hcs_hub_settings,public.hcs_hub_quotas from public,anon,authenticated;
grant select,insert,update,delete on public.hcs_hub_settings,public.hcs_hub_quotas to service_role;
create unique index if not exists hcs_hub_request_id_idx on public.hcs_runs(profile_id,(context->>'request_id')) where context->>'request_id' is not null;
create or replace function public.hcs_hub_reserve_quota(p_profile uuid,p_action text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer; lim integer;
begin
 if p_action not in ('chat','transcribe') then raise exception 'invalid action'; end if;
 lim := case when p_action='chat' then 40 else 30 end;
 delete from public.hcs_hub_quotas where profile_id=p_profile and window_start<now()-interval '2 days';
 insert into public.hcs_hub_quotas(profile_id,action,window_start,uses) values(p_profile,p_action,date_trunc('hour',now()),1)
 on conflict(profile_id,action,window_start) do update set uses=public.hcs_hub_quotas.uses+1 where public.hcs_hub_quotas.uses<lim returning uses into n;
 return n is not null;
end;$$;
create or replace function public.hcs_hub_record_feedback(p_profile uuid,p_run uuid,p_outcome text,p_lesson text default '')
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.hcs_runs%rowtype; event_id uuid;
begin
 if p_outcome is null or length(trim(p_outcome))=0 or length(p_outcome)>2000 or length(coalesce(p_lesson,''))>1000 then raise exception 'invalid feedback'; end if;
 select * into r from public.hcs_runs where id=p_run and profile_id=p_profile for update;
 if not found or r.status<>'running' or (r.context->>'surface') is distinct from 'nexora-hub-v1' or r.result ? 'feedback_recorded_at' then raise exception 'run unavailable or feedback already recorded'; end if;
 insert into public.hcs_learning_events(run_id,profile_id,event_type,observation,metadata) values(p_run,p_profile,'outcome',trim(p_outcome),jsonb_build_object('surface','nexora-hub-v1','evidence_class','self_report','branch',r.context->>'branch','user_confirmed_lesson',trim(coalesce(p_lesson,'')))) returning id into event_id;
 update public.hcs_runs set status='completed',completed_at=now(),result=jsonb_build_object('outcome',trim(p_outcome),'lesson',trim(coalesce(p_lesson,'')),'feedback_recorded_at',now(),'learning_event_id',event_id,'evidence_class','self_report') where id=p_run and profile_id=p_profile;
 return event_id;
end;$$;
revoke execute on function public.hcs_hub_reserve_quota(uuid,text) from public,anon,authenticated;
revoke execute on function public.hcs_hub_record_feedback(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.hcs_hub_reserve_quota(uuid,text) to service_role;
grant execute on function public.hcs_hub_record_feedback(uuid,uuid,text,text) to service_role;
