-- One-time, server-owned confirmations for write actions initiated in the
-- authenticated client's live Anham conversation. The database stores only a
-- token hash and metadata; the signed, short-lived token carries the validated
-- payload and is atomically claimed once by the server.
create table public.assistant_client_actions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.client_cases(id) on delete set null,
  voice_receipt_id uuid not null,
  prepared_turn_id text not null check (char_length(prepared_turn_id) between 1 and 200),
  action text not null check (action in (
    'send_professor_message',
    'save_supplement_schedule',
    'set_supplement_taken',
    'update_profile',
    'save_health_metric',
    'save_sleep_entry'
  )),
  confirmation_token_hash text not null check (confirmation_token_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'executing', 'completed', 'failed', 'expired')),
  result jsonb,
  expires_at timestamptz not null,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assistant_client_actions is
  'Short-lived, one-time confirmations for authenticated client-owned Anham actions; server access only.';

create index assistant_client_actions_owner_status_idx
  on public.assistant_client_actions (profile_id, status, expires_at desc);

alter table public.assistant_client_actions enable row level security;
revoke all on table public.assistant_client_actions from anon, authenticated;
grant select, insert, update on table public.assistant_client_actions to service_role;

create trigger set_assistant_client_actions_updated_at
before update on public.assistant_client_actions
for each row execute function public.set_updated_at();
