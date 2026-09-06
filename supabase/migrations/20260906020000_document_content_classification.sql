alter table public.document_extractions
  add column if not exists content_fingerprint text,
  add column if not exists content_classification text;

alter table public.document_extractions
  drop constraint if exists document_extractions_content_classification_check;

alter table public.document_extractions
  add constraint document_extractions_content_classification_check
  check (content_classification is null or content_classification in ('EMPTY_TEMPLATE', 'CLINICAL_CONTENT'));

create index if not exists document_extractions_content_fingerprint_idx
  on public.document_extractions (case_id, content_fingerprint)
  where content_fingerprint is not null;

comment on column public.document_extractions.content_fingerprint is
  'Deidentified deterministic fingerprint of agreed clinical label/value rows. Never replaces the immutable source fingerprint.';

comment on column public.document_extractions.content_classification is
  'EMPTY_TEMPLATE or CLINICAL_CONTENT. Identity/header-only documents create no clinical facts.';
