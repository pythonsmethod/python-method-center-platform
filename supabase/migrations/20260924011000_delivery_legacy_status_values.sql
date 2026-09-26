-- Older staging databases used pending/cannot_ship while production already
-- uses preparing/problem. Add the canonical values in a separate committed
-- migration so the next migration can safely use them as enum values.
do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'delivery_task_status'
      and e.enumlabel = 'pending'
  ) then
    alter type public.delivery_task_status add value if not exists 'preparing';
    alter type public.delivery_task_status add value if not exists 'problem';
  end if;
end $$;
