-- Where the formula ships to. One free-form field on purpose: postal
-- formats differ across the countries the center serves, and a person
-- knows how to write their own address better than a form does.
-- Editable by the client (profiles_update_own RLS); role/status stay
-- protected by the staff-fields trigger.

alter table public.profiles
  add column if not exists delivery_address text;

comment on column public.profiles.delivery_address is
  'Client-entered shipping address for the formula and shop orders. Free-form, international.';
