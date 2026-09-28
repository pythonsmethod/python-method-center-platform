-- Apply after the new upload action is live. Restrictive policies still
-- override permissive legacy policies on the document metadata table.
alter table public.uploaded_documents enable row level security;
drop policy if exists pmc_document_registration_server_only on public.uploaded_documents;
create policy pmc_document_registration_server_only on public.uploaded_documents as restrictive for insert to authenticated with check(false);
drop policy if exists pmc_document_metadata_server_only on public.uploaded_documents;
create policy pmc_document_metadata_server_only on public.uploaded_documents as restrictive for update to authenticated using(false) with check(false);
