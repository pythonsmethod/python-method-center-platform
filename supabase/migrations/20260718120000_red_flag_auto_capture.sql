-- Automatic red-flag capture from the client AI chat.
--
-- The public chat widget serves visitors who may not be registered yet, so a
-- red-flag event must be recordable without a profile. Registered visitors
-- keep their profile binding. Inserts happen server-side via the service
-- role only; RLS policies are unchanged.

alter table public.escalation_events
  alter column profile_id drop not null;

comment on table public.escalation_events is
  'Red-flag/escalation event records, including automatic captures from the client AI chat (profile_id null for anonymous visitors). These do not change durable case urgency or status; Karen owns those decisions.';
