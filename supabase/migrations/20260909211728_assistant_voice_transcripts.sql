-- Repository-only. Apply to isolated staging before enabling the voice pilot.
-- Reuse conversation history, never Clinical Evidence or Karen decisions.
alter table public.assistant_messages
  add column if not exists conversation_scope text not null default 'client'
    check (conversation_scope in ('client', 'founder', 'karen'));
alter table public.assistant_messages
  add column if not exists source text not null default 'text'
    check (source in ('text', 'voice_transcript'));
alter table public.assistant_messages
  add column if not exists exchange_id text;
alter table public.assistant_messages
  add column if not exists voice_state text
    check (voice_state in ('completed', 'interrupted'));

-- Both rows are inserted atomically. Retries cannot duplicate or overwrite them.
create unique index if not exists assistant_messages_exchange_role_idx
  on public.assistant_messages (profile_id, exchange_id, role);
create index if not exists assistant_messages_scope_history_idx
  on public.assistant_messages (profile_id, conversation_scope, locale, case_id, message_sequence desc);

comment on column public.assistant_messages.source is
  'voice_transcript is client-reported, unverified speech text, not clinical evidence or a Karen decision. No raw audio is stored.';
