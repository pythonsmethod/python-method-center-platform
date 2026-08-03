-- P0-01: a red flag from an anonymous visitor must be recordable.
--
-- The public assistant escalates crises for guests too, but the schema was
-- written for authenticated clients only: profile_id was NOT NULL, so every
-- guest escalation died on insert (23502) and the team received a generic
-- processing error instead of the red-flag alert.
--
-- The foreign key stays: when profile_id is present it must still point at
-- a real profile. Only the NOT NULL is dropped.

alter table public.escalation_events
  alter column profile_id drop not null;

comment on column public.escalation_events.profile_id is
  'Null for anonymous visitors escalated from the public assistant. Contact is impossible; the message excerpt in signals is the only signal.';
