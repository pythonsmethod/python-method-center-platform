alter table public.support_requests add column if not exists contact_phone text;
comment on column public.support_requests.contact_phone is 'Callback phone supplied with a public support request.';
alter table public.support_requests drop constraint if exists support_requests_contact_phone_length;
alter table public.support_requests add constraint support_requests_contact_phone_length
  check (contact_phone is null or char_length(contact_phone) between 7 and 32);
update public.support_requests
set contact_phone = coalesce(
  substring(body from '^Телефон для связи: ([^\r\n]+)'),
  substring(body from '^Contact phone: ([^\r\n]+)')
)
where contact_phone is null and body is not null
  and (body like 'Телефон для связи: %' or body like 'Contact phone: %');
