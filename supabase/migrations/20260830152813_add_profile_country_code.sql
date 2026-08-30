alter table public.profiles
  add column if not exists country_code text;

alter table public.profiles
  drop constraint if exists profiles_country_code_format;

alter table public.profiles
  add constraint profiles_country_code_format
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

comment on column public.profiles.country_code is
  'ISO 3166-1 alpha-2 country selected by the client during onboarding.';

update public.profiles
set country_code = 'KZ'
where id = (
  select profile_id from public.client_cases
  where id = 'a70522e7-ed3b-4d68-a500-706a6d21e4ff'
);
