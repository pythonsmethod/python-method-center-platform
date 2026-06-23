-- P0-005C: Storage and audit safety foundation before document upload.
-- SQL Editor-safe section only.
--
-- Supabase SQL Editor may reject direct DDL on storage.objects with:
-- ERROR: 42501: must be owner of table objects
--
-- For that reason, this migration keeps only public-schema functions/triggers
-- here. Create the private Storage bucket and storage.objects policies through
-- the Supabase Dashboard using supabase/storage_manual_setup.md.

create or replace function public.is_client_document_path_owner(object_name text)
returns boolean
language plpgsql
stable
as $$
declare
  path_parts text[];
  path_user_id uuid;
  path_case_id uuid;
begin
  path_parts := storage.foldername(object_name);

  if array_length(path_parts, 1) < 3 then
    return false;
  end if;

  begin
    path_user_id := path_parts[1]::uuid;
    path_case_id := path_parts[2]::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  if path_user_id <> auth.uid() then
    return false;
  end if;

  return exists (
    select 1
    from public.client_cases
    where id = path_case_id
      and profile_id = auth.uid()
  );
end;
$$;

comment on function public.is_client_document_path_owner(text) is
  'Checks client document object paths in the form {user_id}/{case_id}/{filename} against the authenticated user and case ownership.';

create or replace function public.prevent_uploaded_document_client_tampering()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    if new.status is distinct from old.status then
      raise exception 'Clients cannot update uploaded document status.';
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
  'Prevents authenticated client updates to staff/system-controlled uploaded_documents fields while leaving server/service workflows available.';

drop trigger if exists prevent_uploaded_document_client_tampering
on public.uploaded_documents;

create trigger prevent_uploaded_document_client_tampering
before update on public.uploaded_documents
for each row execute function public.prevent_uploaded_document_client_tampering();
