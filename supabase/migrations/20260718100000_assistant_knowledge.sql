-- Knowledge base for the platform AI assistants.
--
-- Staff (Karen/admin) add entries through the admin workspace; the client
-- assistant and the staff assistant read active entries server-side via the
-- service role when building their system prompts. Clients never read this
-- table directly, so RLS is enabled with no client policies.

create table if not exists public.assistant_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 8000),
  audience text not null default 'client'
    check (audience in ('client', 'staff', 'both')),
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assistant_knowledge is
  'Staff-authored knowledge entries injected into AI assistant prompts. Server-side access only (service role); no client RLS policies.';

alter table public.assistant_knowledge enable row level security;

create index if not exists assistant_knowledge_active_idx
  on public.assistant_knowledge (is_active, audience, created_at desc);
