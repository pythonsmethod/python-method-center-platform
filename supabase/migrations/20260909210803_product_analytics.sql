-- Repository-only. Apply to an isolated test database before any rollout.
create table public.product_events (
  id bigint generated always as identity primary key,
  journey_id uuid not null,
  event text not null check (event in ('landing_view','registration_started','registration_completed','onboarding_view','onboarding_completed','cabinet_view','chat_completed')),
  locale text not null check (locale in ('ru','en')),
  occurred_at timestamptz not null default clock_timestamp(),
  minute_bucket bigint not null default floor(extract(epoch from now()) / 60),
  unique (journey_id, event, minute_bucket)
);
create index product_events_time on public.product_events (occurred_at);
create index product_events_journey on public.product_events (journey_id, event, occurred_at);
alter table public.product_events enable row level security;
revoke all on public.product_events from public, anon, authenticated;
grant select, insert, delete on public.product_events to service_role;
revoke all on sequence public.product_events_id_seq from public, anon, authenticated;
grant usage, select on sequence public.product_events_id_seq to service_role;

create function public.record_product_event(p_journey uuid, p_event text, p_locale text)
returns void language plpgsql security invoker set search_path = '' set statement_timeout = '3s' as $$
begin
  -- Indexed cleanup on ingestion. If ingestion stops, maintenance must still run.
  delete from public.product_events where occurred_at < now() - interval '90 days';
  insert into public.product_events(journey_id, event, locale) values (p_journey, p_event, p_locale)
  on conflict (journey_id, event, minute_bucket) do nothing;
end;
$$;
revoke all on function public.record_product_event(uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_product_event(uuid,text,text) to service_role;

create function public.product_analytics_summary(p_start timestamptz, p_end timestamptz)
returns jsonb language plpgsql security invoker stable set search_path = '' set statement_timeout = '5s' as $$
declare result jsonb;
begin
  if p_start is null or p_end is null or p_end <= p_start or p_end - p_start > interval '31 days'
     or p_start < now() - interval '91 days' or p_end > now() + interval '1 minute' then
    raise exception 'Invalid analytics period';
  end if;
  with recursive
  steps as (
    select ordinality::integer as step, event from unnest(array['landing_view','registration_started','registration_completed','onboarding_view','onboarding_completed','cabinet_view','chat_completed']) with ordinality as s(event,ordinality)
  ),
  cohort as (
    select journey_id, min(occurred_at) as at from public.product_events
    where event='landing_view' and occurred_at >= p_start and occurred_at < p_end group by journey_id
  ),
  journey as (
    select journey_id, 1 as step, at from cohort
    union all
    select j.journey_id, j.step+1, next_event.at from journey j
    join steps s on s.step=j.step+1
    cross join lateral (
      select min(e.occurred_at) as at from public.product_events e
      where e.journey_id=j.journey_id and e.event=s.event and e.occurred_at >= j.at and e.occurred_at < p_end
    ) next_event where next_event.at is not null
  ),
  counts as (
    select s.step,s.event,count(j.journey_id)::integer as journeys from steps s left join journey j on j.step=s.step group by s.step,s.event
  ),
  rates as (select *, lag(journeys) over (order by step) as previous from counts),
  daily as (
    select (occurred_at at time zone 'UTC')::date as day,event,count(*)::integer as events,count(distinct journey_id)::integer as journeys
    from public.product_events where occurred_at >= p_start and occurred_at < p_end group by 1,2
  )
  select jsonb_build_object(
    'unit','consenting_browser_journeys',
    'definition','Ordered landing-entry cohort, all steps within [start,end); not people; recent journeys may still complete.',
    'firstObservedAt',(select min(occurred_at) from public.product_events),
    'lastObservedAt',(select max(occurred_at) from public.product_events),
    'steps',(select jsonb_agg(jsonb_build_object('event',event,'journeys',journeys,'previousJourneys',previous,'conversionFromPrevious',case when previous>0 then round(journeys::numeric/previous,4) else null end,'notObservedAtNextStep',previous-journeys) order by step) from rates),
    'daily',coalesce((select jsonb_agg(to_jsonb(daily) order by day,event) from daily),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.product_analytics_summary(timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.product_analytics_summary(timestamptz,timestamptz) to service_role;
