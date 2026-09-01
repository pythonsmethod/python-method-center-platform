-- Real audio messages for client <-> support conversations.
alter table public.support_request_messages alter column body drop not null;
alter table public.support_request_messages add column if not exists audio_path text;
alter table public.support_request_messages add column if not exists audio_duration_seconds integer;
alter table public.support_request_messages drop constraint if exists support_request_messages_body_length;
alter table public.support_request_messages
  drop constraint if exists support_request_messages_audio_duration,
  drop constraint if exists support_request_messages_has_content;
alter table public.support_request_messages
  add constraint support_request_messages_body_length check (body is null or char_length(btrim(body)) between 1 and 8000),
  add constraint support_request_messages_audio_duration check (audio_duration_seconds is null or audio_duration_seconds between 0 and 3600),
  add constraint support_request_messages_has_content check (body is not null or audio_path is not null);
comment on column public.support_request_messages.audio_path is 'Private object path in the support-audio storage bucket.';
insert into storage.buckets (id, name, public) values ('support-audio', 'support-audio', false)
on conflict (id) do update set public = false;
