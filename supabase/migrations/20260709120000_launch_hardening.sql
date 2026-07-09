-- Launch hardening before the first real client.
--
-- 1. Remove placeholder client-insert policies for payments and escalation
--    events: payment records are created only by server/staff workflows, and
--    escalation events have no client-facing runtime yet.
-- 2. Enforce the storage path convention on client document inserts so a
--    client cannot register metadata that points at another user's storage
--    objects.

drop policy if exists "payments_insert_own_placeholder" on public.payments;

drop policy if exists "escalation_events_insert_own_placeholder"
on public.escalation_events;

create or replace function public.prevent_uploaded_document_client_tampering()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.document_status = 'uploaded';

      if new.storage_path is null
        or new.storage_path not like auth.uid()::text || '/%' then
        raise exception
          'Uploaded document storage path must stay inside the owner folder.';
      end if;

      return new;
    end if;

    if new.status is distinct from old.status then
      raise exception 'Clients cannot update uploaded document status.';
    end if;

    if new.document_status is distinct from old.document_status then
      raise exception 'Clients cannot update uploaded document intake status.';
    end if;

    if new.profile_id is distinct from old.profile_id then
      raise exception 'Clients cannot transfer uploaded documents between profiles.';
    end if;

    if new.case_id is distinct from old.case_id then
      raise exception 'Clients cannot transfer uploaded documents between cases.';
    end if;

    if new.storage_path is distinct from old.storage_path then
      raise exception 'Clients cannot change uploaded document storage path.';
    end if;

    if new.archived_at is distinct from old.archived_at then
      raise exception 'Clients cannot archive or unarchive uploaded documents.';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.prevent_uploaded_document_client_tampering() is
  'Forces authenticated client inserts to document_status=uploaded with an owner-scoped storage path, and prevents authenticated client updates to staff/system-controlled uploaded_documents fields while leaving server/service workflows available.';
