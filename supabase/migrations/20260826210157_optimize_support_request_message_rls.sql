-- Evaluate auth.uid() once per statement in support-message RLS policies.

drop policy if exists "support_request_messages_select_own"
  on public.support_request_messages;

create policy "support_request_messages_select_own"
on public.support_request_messages for select
to authenticated
using (
  exists (
    select 1
    from public.support_requests request
    where request.id = support_request_id
      and request.profile_id = (select auth.uid())
  )
);

drop policy if exists "support_request_messages_insert_own"
  on public.support_request_messages;

create policy "support_request_messages_insert_own"
on public.support_request_messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and sender_role = 'client'
  and profile_id = (select auth.uid())
  and exists (
    select 1
    from public.support_requests request
    where request.id = support_request_id
      and request.profile_id = (select auth.uid())
  )
);
