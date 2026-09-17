alter table public.support_requests
  add column if not exists is_case_thread boolean not null default false;

comment on column public.support_requests.is_case_thread is
  'True only for the single staff-initiated support conversation attached to a Case.';

create unique index if not exists support_requests_one_case_thread_idx
  on public.support_requests (case_id)
  where is_case_thread = true and case_id is not null;
