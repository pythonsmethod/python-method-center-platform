-- Keep Russian and English conversations separate and give every message a
-- stable order. Existing rows intentionally keep locale NULL: they remain in
-- the staff archive but no longer leak old test conversations into either UI.
alter table public.assistant_messages
  add column if not exists locale text
    constraint assistant_messages_locale_check check (locale in ('ru', 'en'));

alter table public.assistant_messages
  add column if not exists message_sequence bigint generated always as identity;

create index if not exists assistant_messages_profile_locale_sequence_idx
  on public.assistant_messages (profile_id, locale, message_sequence desc);
