-- Anham message reactions v1.
--
-- Anham may attach one small emoji reaction to the person's own message, the
-- way reactions work in a messenger. The reaction is stored on the person's
-- message row as an allowlisted key, never as free text or an emoji, and only
-- the server writes it. Existing rows keep NULL; no backfill.
alter table public.assistant_messages
  add column if not exists reaction text;

alter table public.assistant_messages
  drop constraint if exists assistant_messages_reaction_allowlist;
alter table public.assistant_messages
  add constraint assistant_messages_reaction_allowlist check (
    reaction is null
    or (
      role = 'user'
      and reaction in ('heart', 'clap', 'celebrate', 'thumbs_up', 'eyes', 'smile', 'thanks', 'strength')
    )
  );

comment on column public.assistant_messages.reaction is
  'Anham''s optional reaction to this user message: an allowlisted key rendered as emoji by the interface. Server-written after safety checks; communication UX only, not clinical data.';
