-- P0-005C: Storage and audit safety foundation before document upload.
-- This migration adds a private client document bucket, storage.objects RLS
-- policies, and a client tamper guard for uploaded_documents status fields.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'client-documents',
  'client-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table storage.objects is
  'Supabase Storage object metadata. Client document objects are private and path-scoped to the authenticated profile.';

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

drop policy if exists "client_documents_select_own"
on storage.objects;

create policy "client_documents_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'client-documents'
  and public.is_client_document_path_owner(name)
);

drop policy if exists "client_documents_insert_own"
on storage.objects;

create policy "client_documents_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'client-documents'
  and public.is_client_document_path_owner(name)
);

drop policy if exists "client_documents_update_own"
on storage.objects;

create policy "client_documents_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'client-documents'
  and public.is_client_document_path_owner(name)
)
with check (
  bucket_id = 'client-documents'
  and public.is_client_document_path_owner(name)
);

drop policy if exists "client_documents_delete_own"
on storage.objects;

create policy "client_documents_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'client-documents'
  and public.is_client_document_path_owner(name)
);

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
