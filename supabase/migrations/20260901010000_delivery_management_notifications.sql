alter table public.delivery_tasks
  alter column volunteer_id drop not null,
  add column if not exists client_viewed_at timestamptz;

create index if not exists delivery_tasks_unassigned_created_idx
  on public.delivery_tasks (created_at desc)
  where volunteer_id is null;

comment on column public.delivery_tasks.client_viewed_at is
  'When the client last opened the shipped delivery result. Null means a new delivery notification.';
