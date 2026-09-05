create sequence if not exists public.client_case_number_seq
  as bigint
  start with 481
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

alter table public.client_cases
  alter column case_number
  set default ('#' || nextval('public.client_case_number_seq'::regclass)::text);

grant usage, select on sequence public.client_case_number_seq
  to authenticated, service_role;

-- Historical Case #480 was assigned as an operational data correction in the
-- production database. A schema migration must remain data-independent so a
-- data-less staging database can be rebuilt without production row IDs.
