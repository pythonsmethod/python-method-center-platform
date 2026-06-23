-- P0-006A: strict Storage RLS for client document objects.
--
-- Apply this with a database owner/admin context. If Supabase SQL Editor
-- returns "ERROR: 42501: must be owner of table objects", use the Supabase
-- Dashboard Storage policy UI and the matching steps in
-- supabase/storage_manual_setup.md.
--
-- Required object name format inside the client-documents bucket:
-- {user_id}/{case_id}/{document_id}/{original_filename}

-- Inspect current policies first and remove any broader authenticated SELECT
-- policy for the client-documents bucket before relying on this fix.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

update storage.buckets
set public = false
where id = 'client-documents';

drop policy if exists client_documents_select_own
on storage.objects;

drop policy if exists client_documents_insert_own
on storage.objects;

drop policy if exists client_documents_update_own
on storage.objects;

drop policy if exists client_documents_delete_own
on storage.objects;

create policy client_documents_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) = 3
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy client_documents_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) = 3
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- No authenticated UPDATE or DELETE policy is created for P0-006A.
