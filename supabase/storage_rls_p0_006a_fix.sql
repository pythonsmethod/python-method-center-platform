-- P0-006A-FIX : Storage RLS repair for bucket "client-documents"
-- Reason: the original supabase/storage_rls_p0_006a.sql used DROP POLICY names
-- that did not match the live policy names, so stale policies were left in place
-- and SELECT/INSERT policies were duplicated.
--
-- This repair reflects the ACTUAL live policy names captured from
-- pg_policies (schemaname='storage', tablename='objects').
--
-- End state goal:
--   * exactly ONE SELECT policy  (authenticated, own-path only)
--   * exactly ONE INSERT policy  (authenticated, own-path only)
--   * NO UPDATE policy
--   * NO DELETE policy
--   * NO duplicate policies
--   * bucket stays PRIVATE (this file does NOT modify the bucket)
--
-- Object path contract inside the bucket:
--   {user_id}/{case_id}/{document_id}/{original_filename}
--   -> storage.foldername(name) has 3 segments; segment[1] = auth.uid()
--
-- Apply with a database owner/admin context (Supabase SQL Editor, role: postgres).
-- If "ERROR: 42501: must be owner of table objects" occurs, use the Supabase
-- Dashboard Storage policy UI per supabase/storage_manual_setup.md.

-- 1) Inspect BEFORE state (read-only)
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by cmd, policyname;

-- 2) Remove ALL stale / duplicate / out-of-scope policies by their ACTUAL names.
--    (Quoted because the live names contain a space.)
drop policy if exists "client_documents_delete_own 1lx41ti_0" on storage.objects;
drop policy if exists "client_documents_delete_own 1lx41ti_1" on storage.objects;
drop policy if exists "client_documents_update_own 1lx41ti_0" on storage.objects;
drop policy if exists "client_documents_update_own 1lx41ti_1" on storage.objects;
drop policy if exists "client_documents_insert_own 1lx41ti_0" on storage.objects;
drop policy if exists "client_documents_select_own 1lx41ti_0" on storage.objects;

-- 3) Also drop the two intended policies so this script is idempotent
--    (safe to re-run; they are recreated immediately below).
drop policy if exists "client_documents_select_own" on storage.objects;
drop policy if exists "client_documents_insert_own" on storage.objects;

-- 4) Recreate ONLY the intended policies.

-- SELECT: authenticated user may read only objects under their own user-id folder.
create policy "client_documents_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) = 3
  and (auth.uid())::text = (storage.foldername(name))[1]
);

-- INSERT: authenticated user may upload only into their own user-id folder.
create policy "client_documents_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-documents'
  and array_length(storage.foldername(name), 1) = 3
  and (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5) Verify AFTER state (read-only). Expect exactly 2 rows: 1 SELECT, 1 INSERT.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by cmd, policyname;
