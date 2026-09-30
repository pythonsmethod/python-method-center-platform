create extension if not exists pg_net;

create schema if not exists private;

create or replace function private.enqueue_team_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
begin
  select decrypted_secret
    into webhook_secret
    from vault.decrypted_secrets
   where name = 'database_team_notification_webhook_secret'
   limit 1;

  if coalesce(webhook_secret, '') = '' then
    raise warning 'database team notification secret is not configured';
    return new;
  end if;

  perform net.http_post(
    url := 'https://zdrfttgwnyorifmpqgwe.supabase.co/functions/v1/database-team-notifications',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', jsonb_build_object('id', new.id)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    raise warning 'could not enqueue team notification: %', sqlerrm;
    return new;
end;
$$;

revoke all on function private.enqueue_team_notification() from public;
revoke all on function private.enqueue_team_notification() from anon;
revoke all on function private.enqueue_team_notification() from authenticated;

drop trigger if exists notify_team_on_profile_insert on public.profiles;
create trigger notify_team_on_profile_insert
after insert on public.profiles
for each row execute function private.enqueue_team_notification();

drop trigger if exists notify_team_on_case_insert on public.client_cases;
create trigger notify_team_on_case_insert
after insert on public.client_cases
for each row execute function private.enqueue_team_notification();

comment on function private.enqueue_team_notification() is
  'Enqueues minimal profile/case INSERT events for the protected Telegram notification relay.';
