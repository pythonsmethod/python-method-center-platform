alter table public.support_requests add column if not exists contact_name text;
comment on column public.support_requests.contact_name is 'Full name supplied with a public support request.';
alter table public.support_requests drop constraint if exists support_requests_contact_name_length;
alter table public.support_requests add constraint support_requests_contact_name_length
  check (contact_name is null or char_length(contact_name) between 3 and 120);
