-- Bring a legacy staging delivery schema up to the already-deployed
-- production shape. Existing tasks and subscriptions are preserved.
alter table public.profiles
  add column if not exists delivery_first_name text,
  add column if not exists delivery_last_name text,
  add column if not exists delivery_email text,
  add column if not exists delivery_phone text,
  add column if not exists delivery_region text,
  add column if not exists delivery_city text,
  add column if not exists delivery_street text,
  add column if not exists delivery_building text,
  add column if not exists delivery_unit text,
  add column if not exists delivery_postal_code text,
  add column if not exists delivery_instructions text,
  add column if not exists delivery_confirmed_at timestamptz;

alter table public.delivery_tasks
  add column if not exists case_id uuid references public.client_cases(id) on delete set null,
  add column if not exists client_viewed_at timestamptz,
  add column if not exists delivery_instructions text,
  add column if not exists recipient_email text,
  add column if not exists shipment_document_name text,
  add column if not exists shipment_document_path text,
  add column if not exists volunteer_comment text;

update public.delivery_tasks set status = 'preparing'::public.delivery_task_status
  where status::text = 'pending';
update public.delivery_tasks set status = 'problem'::public.delivery_task_status
  where status::text = 'cannot_ship';

alter table public.delivery_tasks
  alter column status set default 'preparing'::public.delivery_task_status,
  alter column recipient_email set not null,
  alter column recipient_phone set not null,
  alter column volunteer_id drop not null;
