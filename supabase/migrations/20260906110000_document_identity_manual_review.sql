-- Keep the automatic header mismatch as source evidence while allowing an
-- authorized human to confirm that the file belongs in this existing Case.
alter table public.uploaded_documents
  add column if not exists identity_review_status text not null default 'unreviewed'
    check (identity_review_status in ('unreviewed', 'confirmed_belongs_to_case')),
  add column if not exists identity_reviewed_at timestamptz,
  add column if not exists identity_reviewed_by uuid references public.profiles(id) on delete set null;

comment on column public.uploaded_documents.identity_review_status is
  'Separate human Case-membership decision. It never rewrites automatic identity_status or reasons.';
comment on column public.uploaded_documents.identity_reviewed_at is
  'Time an authorized staff member confirmed that a mismatched document belongs in this Case.';
comment on column public.uploaded_documents.identity_reviewed_by is
  'Staff actor who confirmed Case membership; the event is also written to audit_logs.';

create index if not exists uploaded_documents_identity_reviewed_by_idx
  on public.uploaded_documents (identity_reviewed_by)
  where identity_reviewed_by is not null;
