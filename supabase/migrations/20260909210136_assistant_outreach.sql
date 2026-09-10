-- Repository-only. No sends/backfill during migration; the app is disabled by default.
create table public.assistant_outreach_state (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  opted_out boolean not null default false,
  last_sent_at timestamptz,
  delivered_count integer not null default 0 check (delivered_count >= 0),
  check ((delivered_count = 0) = (last_sent_at is null))
);
alter table public.assistant_outreach_state enable row level security;
revoke all on public.assistant_outreach_state from public, anon, authenticated;
grant select, insert, update on public.assistant_outreach_state to service_role;

alter table public.assistant_messages
  add column outreach_number integer;
alter table public.assistant_messages
  add column outreach_translations jsonb;
alter table public.assistant_messages
  add constraint assistant_outreach_payload_check check (
    (outreach_number is null and outreach_translations is null) or
    (outreach_number is not null and outreach_number >= 0 and role = 'assistant'
      and outreach_translations is not null
      and jsonb_typeof(outreach_translations->'ru') = 'string'
      and jsonb_typeof(outreach_translations->'en') = 'string'
      and outreach_translations ? 'ru' and outreach_translations ? 'en')
  );
create unique index assistant_outreach_message_once
  on public.assistant_messages(profile_id, outreach_number)
  where outreach_number is not null;

-- Conservative explicit commands only; no medical text is sent to an AI classifier.
create function public.is_assistant_outreach_refusal(p_text text)
returns boolean language sql immutable security invoker set search_path = '' as $$
  select coalesce(lower(p_text) ~
    '(не (пиши|пишите|присылай|присылайте|отправляй|отправляйте)|отписаться|отпишите|отписываюсь|unsubscribe|stop (messaging|sending|writing)|do not (message|send|write)|don[''’]?t (message|send|write))', false);
$$;
revoke all on function public.is_assistant_outreach_refusal(text) from public, anon, authenticated;
grant execute on function public.is_assistant_outreach_refusal(text) to service_role;

-- All saved user-message paths (including voice transcripts) share this guard.
create function public.capture_assistant_outreach_refusal()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.role = 'user' and public.is_assistant_outreach_refusal(new.content) then
    insert into public.assistant_outreach_state(profile_id, opted_out)
    values (new.profile_id, true)
    on conflict (profile_id) do update set opted_out = true;
  end if;
  return new;
end;
$$;
revoke all on function public.capture_assistant_outreach_refusal() from public, anon, authenticated;
grant execute on function public.capture_assistant_outreach_refusal() to service_role;
create trigger assistant_outreach_refusal
  after insert on public.assistant_messages
  for each row execute function public.capture_assistant_outreach_refusal();

-- One transaction owns eligibility, preference lock, message and delivery cursor.
-- A crash rolls everything back; a lost HTTP response is safe to retry.
create function public.deliver_assistant_outreach(
  p_profile_id uuid default null,
  p_welcome_only boolean default false,
  p_limit integer default 100
)
returns integer language plpgsql security invoker set search_path = '' set timezone = 'UTC' as $$
declare
  candidate record;
  delivery public.assistant_outreach_state%rowtype;
  sent integer := 0;
  sent_at timestamptz;
  translations jsonb;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Invalid batch size';
  end if;
  for candidate in
    select p.id, p.locale
    from public.profiles p
    left join public.assistant_outreach_state s on s.profile_id = p.id
    where p.role = 'client' and p.status in ('registered', 'active')
      and (p_profile_id is null or p.id = p_profile_id)
      and not coalesce(s.opted_out, false)
      and (s.last_sent_at is null or
        (not p_welcome_only and s.last_sent_at <= clock_timestamp() - interval '72 hours'))
    order by s.last_sent_at nulls first, p.created_at, p.id
    limit p_limit
    for no key update of p skip locked
  loop
    insert into public.assistant_outreach_state(profile_id) values (candidate.id)
      on conflict (profile_id) do nothing;
    select * into delivery from public.assistant_outreach_state
      where profile_id = candidate.id for update;
    sent_at := clock_timestamp();
    if delivery.opted_out or (delivery.last_sent_at is not null and
      (p_welcome_only or delivery.last_sent_at > sent_at - interval '72 hours')) then
      continue;
    end if;
    -- Covers explicit refusals saved before this migration, in either language.
    if exists (select 1 from public.assistant_messages m where m.profile_id = candidate.id
      and m.role = 'user' and public.is_assistant_outreach_refusal(m.content)) then
      update public.assistant_outreach_state set opted_out = true where profile_id = candidate.id;
      continue;
    end if;
    if delivery.delivered_count = 0 then
      translations := jsonb_build_object(
        'ru', 'Здравствуйте, я Анхам. Добро пожаловать в ваш личный кабинет. Здесь можно задать вопрос о работе кабинета или просто начать разговор в удобном для вас темпе. Отвечать сейчас не обязательно. Автоматические сообщения можно отключить кнопкой в чате.',
        'en', 'Hello, I’m Anham. Welcome to your personal cabinet. You can ask how the cabinet works or start a conversation at your own pace. There is no need to reply now. You can turn off automatic messages using the button in this chat.');
    else
      translations := jsonb_build_object(
        'ru', 'Здравствуйте, это Анхам. Если вам нужна помощь с кабинетом или хочется задать организационный вопрос, можно написать здесь, когда будет удобно. Отвечать не обязательно. Автоматические сообщения можно отключить кнопкой в чате.',
        'en', 'Hello, it’s Anham. If you need help with the cabinet or have an organizational question, you can write here whenever it suits you. There is no need to reply. You can turn off automatic messages using the button in this chat.');
    end if;
    insert into public.assistant_messages
      (profile_id, role, content, tier, locale, created_at, outreach_number, outreach_translations)
    values (candidate.id, 'assistant', translations->>(case when candidate.locale = 'en' then 'en' else 'ru' end),
      'registered', case when candidate.locale = 'en' then 'en' else 'ru' end,
      sent_at, delivery.delivered_count, translations);
    update public.assistant_outreach_state
      set last_sent_at = sent_at, delivered_count = delivered_count + 1
      where profile_id = candidate.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke all on function public.deliver_assistant_outreach(uuid, boolean, integer) from public, anon, authenticated;
grant execute on function public.deliver_assistant_outreach(uuid, boolean, integer) to service_role;
