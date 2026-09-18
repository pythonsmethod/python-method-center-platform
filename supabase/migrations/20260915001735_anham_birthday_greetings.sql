-- Birthday delivery reuses the canonical append-only health questionnaire
-- instead of copying the date of birth into profiles. Profiles keep only the
-- browser time zone needed to choose the person's local calendar day.
alter table public.profiles
  add column time_zone text not null default 'America/Los_Angeles'
  constraint profiles_time_zone_shape_check
    check (char_length(time_zone) between 1 and 64 and time_zone ~ '^[A-Za-z0-9_+./-]+$');

alter table public.assistant_messages
  add column scheduled_event_key text;
alter table public.assistant_messages
  add column scheduled_translations jsonb;
alter table public.assistant_messages
  add constraint assistant_scheduled_payload_check check (
    (scheduled_event_key is null and scheduled_translations is null) or
    (scheduled_event_key is not null and role = 'assistant'
      and scheduled_translations is not null
      and jsonb_typeof(scheduled_translations->'ru') = 'string'
      and jsonb_typeof(scheduled_translations->'en') = 'string'
      and scheduled_translations ? 'ru' and scheduled_translations ? 'en')
  );

create unique index assistant_scheduled_event_once
  on public.assistant_messages(scheduled_event_key)
  where scheduled_event_key is not null;

create function public.deliver_assistant_birthday_greetings(
  p_now timestamptz default clock_timestamp(),
  p_limit integer default 500
)
returns integer
language plpgsql
security invoker
set search_path = ''
set timezone = 'UTC'
as $$
declare
  inserted_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'Invalid batch size';
  end if;

  with latest_questionnaire as (
    select distinct on (q.profile_id)
      q.profile_id, q.birth_date
    from public.health_questionnaire_versions q
    order by q.profile_id, q.created_at desc, q.id desc
  ), eligible as (
    select
      p.id as profile_id,
      case when p.locale = 'en' then 'en' else 'ru' end as locale,
      split_part(trim(coalesce(p.full_name, '')), ' ', 1) as first_name,
      q.birth_date,
      to_char(timezone(p.time_zone, p_now), 'YYYY') as local_year
    from public.profiles p
    join latest_questionnaire q on q.profile_id = p.id
    left join public.assistant_outreach_state s on s.profile_id = p.id
    where p.role = 'client'
      and p.status in ('registered', 'active')
      and q.birth_date is not null
      and not coalesce(s.opted_out, false)
      and exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = p.time_zone)
      and to_char(timezone(p.time_zone, p_now), 'MM-DD') = to_char(q.birth_date, 'MM-DD')
    order by p.id
    limit p_limit
  ), messages as (
    select
      e.*,
      jsonb_build_object(
        'ru', case when e.first_name = '' then
          'С днём рождения! 🎉 Желаю тепла, сил, хороших людей рядом и много светлых моментов в новом году жизни. Я рад, что могу быть рядом. — Анхам'
        else 'С днём рождения, ' || left(e.first_name, 80) || '! 🎉 Желаю тепла, сил, хороших людей рядом и много светлых моментов в новом году жизни. Я рад, что могу быть рядом. — Анхам' end,
        'en', case when e.first_name = '' then
          'Happy birthday! 🎉 I wish you warmth, strength, good people nearby, and many bright moments in the year ahead. I’m glad to be here with you. — Anham'
        else 'Happy birthday, ' || left(e.first_name, 80) || '! 🎉 I wish you warmth, strength, good people nearby, and many bright moments in the year ahead. I’m glad to be here with you. — Anham' end
      ) as translations
    from eligible e
  )
  insert into public.assistant_messages
    (profile_id, role, content, tier, locale, created_at,
     scheduled_event_key, scheduled_translations)
  select
    m.profile_id, 'assistant', m.translations->>m.locale,
    'registered', m.locale, p_now,
    'birthday:' || m.profile_id::text || ':' || m.local_year,
    m.translations
  from messages m
  on conflict (scheduled_event_key) where scheduled_event_key is not null do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.deliver_assistant_birthday_greetings(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.deliver_assistant_birthday_greetings(timestamptz, integer)
  to service_role;
