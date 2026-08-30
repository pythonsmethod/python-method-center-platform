create sequence if not exists public.client_case_number_seq
  as bigint
  start with 481
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

alter sequence public.client_case_number_seq
  owned by public.client_cases.case_number;

alter table public.client_cases
  alter column case_number
  set default ('#' || nextval('public.client_case_number_seq'::regclass)::text);

grant usage, select on sequence public.client_case_number_seq
  to authenticated, service_role;

update public.client_cases
set case_number = '#480'
where id = 'a70522e7-ed3b-4d68-a500-706a6d21e4ff'
  and case_number is null;

do $$
begin
  if not exists (
    select 1
    from public.client_cases
    where id = 'a70522e7-ed3b-4d68-a500-706a6d21e4ff'
      and case_number = '#480'
  ) then
    raise exception 'Could not assign case #480 to the requested case';
  end if;
end
$$;
