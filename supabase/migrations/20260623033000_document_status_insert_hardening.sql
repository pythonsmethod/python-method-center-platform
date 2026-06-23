-- P0-007A: Document status insert hardening.
--
-- Authenticated client inserts must always result in document_status = uploaded.
-- This does not add queue consumers, AI, OCR, Karen workflow, medical
-- interpretation, routing, recommendations, or escalation logic.

create or replace function public.prevent_uploaded_document_client_tampering()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if tg_op = 'INSERT' then
      new.document_status = 'uploaded';
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
  'Forces authenticated client inserts to document_status=uploaded and prevents authenticated client updates to staff/system-controlled uploaded_documents fields while leaving server/service workflows available.';

drop trigger if exists prevent_uploaded_document_client_insert_status
on public.uploaded_documents;

create trigger prevent_uploaded_document_client_insert_status
before insert on public.uploaded_documents
for each row execute function public.prevent_uploaded_document_client_tampering();
