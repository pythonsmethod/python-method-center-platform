-- Record one knowledge gap atomically.
--
-- The previous application flow performed "find recent event", "find/create
-- draft" and "insert event" as separate requests. Two concurrent honesty
-- guard replies could therefore create duplicate drafts and duplicate events.
-- A transaction-scoped advisory lock serializes one topic so concurrent
-- audiences/locales cannot create duplicate topic drafts. Event deduplication
-- remains scoped to (topic, audience, locale).
-- The function receives enumerated codes and generic draft seed copy only.
-- Client question text and identifiers are never arguments.

create or replace function public.record_assistant_gap_event(
  p_topic text,
  p_audience text,
  p_escalation_target text,
  p_locale text,
  p_draft_title text,
  p_draft_content text
)
returns table (
  record_status text,
  event_id uuid,
  knowledge_draft_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_draft_id uuid;
begin
  if p_topic not in (
    'service_scope', 'pricing_and_plans', 'payment_or_refund',
    'access_or_account', 'documents_and_uploads', 'schedule_and_timing',
    'methodology', 'medical_review', 'unclassified'
  ) then
    raise exception 'invalid assistant gap topic' using errcode = '22023';
  end if;

  if p_audience not in ('client', 'staff') then
    raise exception 'invalid assistant gap audience' using errcode = '22023';
  end if;

  if p_escalation_target not in ('karen', 'support', 'team') then
    raise exception 'invalid assistant gap escalation target' using errcode = '22023';
  end if;

  if p_locale not in ('ru', 'en') then
    raise exception 'invalid assistant gap locale' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'assistant_gap_draft:' || p_topic,
      0
    )
  );

  select event.id, event.knowledge_draft_id
  into v_event_id, v_draft_id
  from public.assistant_gap_events as event
  where event.topic = p_topic
    and event.audience = p_audience
    and event.locale = p_locale
    and event.created_at >= pg_catalog.now() - interval '60 minutes'
  order by event.created_at desc
  limit 1;

  if v_event_id is not null then
    return query select 'deduplicated'::text, v_event_id, v_draft_id;
    return;
  end if;

  select knowledge.id
  into v_draft_id
  from public.assistant_knowledge as knowledge
  where knowledge.title = p_draft_title
    and knowledge.is_active = false
  order by knowledge.created_at asc
  limit 1;

  if v_draft_id is null then
    insert into public.assistant_knowledge (
      title,
      content,
      audience,
      collection,
      is_active
    ) values (
      p_draft_title,
      p_draft_content,
      'staff',
      'general',
      false
    )
    returning id into v_draft_id;
  end if;

  insert into public.assistant_gap_events (
    topic,
    audience,
    escalation_target,
    locale,
    knowledge_draft_id
  ) values (
    p_topic,
    p_audience,
    p_escalation_target,
    p_locale,
    v_draft_id
  )
  returning id into v_event_id;

  return query select 'recorded'::text, v_event_id, v_draft_id;
end;
$$;

revoke all on function public.record_assistant_gap_event(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_assistant_gap_event(text, text, text, text, text, text)
  to service_role;
