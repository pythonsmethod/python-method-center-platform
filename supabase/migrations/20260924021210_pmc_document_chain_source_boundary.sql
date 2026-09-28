-- Document metadata policies move to the post-deployment migration. The
-- existing live application still writes metadata with its authenticated
-- session until the new server registration action is deployed.

-- Bucket creation through SQL is supported by the Supabase Storage quickstart.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-documents','client-documents',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists pmc_document_upload_own_case on storage.objects;
create policy pmc_document_upload_own_case on storage.objects for insert to authenticated with check(
 bucket_id='client-documents' and split_part(name,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.client_cases c where c.id::text=split_part(name,'/',2) and c.profile_id=(select auth.uid()))
 and split_part(name,'/',3) ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$');
drop policy if exists pmc_document_read_own on storage.objects;
create policy pmc_document_read_own on storage.objects for select to authenticated using(bucket_id='client-documents' and split_part(name,'/',1)=(select auth.uid())::text);
drop policy if exists pmc_document_storage_owner_boundary on storage.objects;
create policy pmc_document_storage_owner_boundary on storage.objects as restrictive for select to authenticated using(bucket_id<>'client-documents' or split_part(name,'/',1)=(select auth.uid())::text);
drop policy if exists pmc_document_storage_upload_boundary on storage.objects;
create policy pmc_document_storage_upload_boundary on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'client-documents' or (split_part(name,'/',1)=(select auth.uid())::text and exists(select 1 from public.client_cases c where c.id::text=split_part(name,'/',2) and c.profile_id=(select auth.uid()))));
drop policy if exists pmc_document_original_no_overwrite on storage.objects;
create policy pmc_document_original_no_overwrite on storage.objects as restrictive for update to authenticated using(bucket_id<>'client-documents') with check(bucket_id<>'client-documents');
