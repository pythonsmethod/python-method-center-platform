-- The escalation mechanism is gone, and so is its table.
--
-- escalation_events held the automatic red-flag captures from the assistant
-- chat: an event row and a Telegram alert whenever crisis language appeared,
-- promised to clients in clause 7 of the privacy policy. The owner removed
-- the mechanism: the centre does rehabilitation and recovery, not emergency
-- care, and a platform that promises to notice a crisis promises a kind of
-- help it cannot give.
--
-- The table is dropped rather than left behind. Its rows were excerpts of
-- real people's messages in a crisis, kept for a review process that no
-- longer exists and under a policy clause that no longer exists. There is
-- no remaining basis to hold them.
--
-- notification_events keeps its delivery log: those rows carry a title and a
-- link, never the excerpt.

drop table if exists public.escalation_events cascade;
