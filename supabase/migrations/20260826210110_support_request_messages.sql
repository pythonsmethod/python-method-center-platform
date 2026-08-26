-- Persistent support conversations. The request row remains the ticket
-- summary; every client and team reply is kept as an append-only message.

create table if not exists public.support_request_messages (
  id uuid primary key default gen_random_uuid(),
  support_request_id uuid not null references public.support_requests(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role public.actor_role not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint support_request_messages_body_length check (
    char_length(btrim(body)) between 1 and 8000
  )
);

comment on table public.support_request_messages is
  'Append-only conversation between a client and the support team inside a support request.';

create index if not exists support_request_messages_request_created_idx
  on public.support_request_messages (support_request_id, created_at);
create index if not exists support_request_messages_profile_idx
  on public.support_request_messages (profile_id);
create index if not exists support_request_messages_sender_idx
  on public.support_request_messages (sender_id);

alter table public.support_request_messages enable row level security;

grant select, insert on public.support_request_messages to authenticated;

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

-- Preserve the opening text of every existing request as the first message.
insert into public.support_request_messages (
  support_request_id,
  profile_id,
  sender_id,
  sender_role,
  body,
  created_at
)
select id, profile_id, profile_id, 'client'::public.actor_role, body, created_at
from public.support_requests
where body is not null
  and btrim(body) <> ''
  and not exists (
    select 1
    from public.support_request_messages message
    where message.support_request_id = support_requests.id
  );

-- New request creation already has several entry points. A database trigger
-- makes their opening messages consistent without duplicating application code.
create or replace function public.copy_support_request_opening_message()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.body is not null and btrim(new.body) <> '' then
    insert into public.support_request_messages (
      support_request_id,
      profile_id,
      sender_id,
      sender_role,
      body,
      created_at
    ) values (
      new.id,
      new.profile_id,
      new.profile_id,
      'client',
      new.body,
      new.created_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists copy_support_request_opening_message
  on public.support_requests;

create trigger copy_support_request_opening_message
after insert on public.support_requests
for each row execute function public.copy_support_request_opening_message();
