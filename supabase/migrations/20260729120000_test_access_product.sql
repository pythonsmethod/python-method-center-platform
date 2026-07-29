-- Test access: a $3 product for invited testers from different countries.
--
-- It exists so people can walk the real paid path — Stripe checkout, the
-- webhook, the cabinet, the personal AI of a paying client — without
-- paying for a full support plan. It is a separate product value on
-- purpose: test money must never be mixed into revenue reports.
--
-- Run this statement on its own (Postgres does not allow a new enum value
-- to be added and used inside the same transaction).

alter type public.payment_product add value if not exists 'test_access';
