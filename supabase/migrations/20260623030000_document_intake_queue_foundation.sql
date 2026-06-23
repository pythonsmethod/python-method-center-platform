-- P0-007: Document intake queue foundation.
--
-- Adds a dedicated document_status lifecycle field for uploaded document intake.
-- This does not add OCR, AI analysis, medical interpretation, routing, review,
-- recommendations, or Karen workflow.

do $$
begin
  create type public.document_intake_status as enum (
    'uploaded',
    'queued',
    'ready',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table public.uploaded_documents
add column if not exists document_status public.document_intake_status;

update public.uploaded_documents
set document_status = 'uploaded'
where document_status is null;

alter table public.uploaded_documents
alter column document_status set default 'uploaded',
alter column document_status set not null;

comment on column public.uploaded_documents.document_status is
  'Document intake lifecycle status for upload queue tracking only. No AI, OCR, medical interpretation, or review decisions are represented.';

create index if not exists uploaded_documents_document_status_idx
on public.uploaded_documents (document_status);

create index if not exists uploaded_documents_case_document_status_idx
on public.uploaded_documents (case_id, document_status);

create or replace function public.prevent_uploaded_document_client_tampering()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
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
  'Prevents authenticated client updates to staff/system-controlled uploaded_documents fields, including document_status, while leaving server/service workflows available.';
