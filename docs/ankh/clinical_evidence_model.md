# Clinical Evidence layer — Phase 2.5B

Status: repository-only design and implementation. The migration is intentionally not applied to production.

## Why this layer exists

`canonical_lab_facts` models laboratory observations and must remain narrow. Radiology narrative, procedures, pathology conclusions and biomarker tables are source-reported clinical evidence, not lab rows and not Ankh interpretation. The new layer complements the existing Case and `uploaded_documents`; it does not create a second Case, role model, queue or state machine.

```text
uploaded_documents
  → clinical_document_metadata (classification only)
  → clinical_evidence_items (source-grounded evidence + provenance)
  → optional deterministic links / technical timeline
  → Phase 3 interpretation later and separately
```

`clinical_document_metadata` stores document type, classification reasons/confidence, layout family, language, version kind and page/layout signals. Classification never creates a diagnosis.

`clinical_evidence_items` preserves original source text, page and coordinates; normalized/coded/numeric values are nullable. It carries laterality/site, event date and date kind, confidence, verification/normalization status and provider/parser versions. Optional links to `canonical_lab_facts` and a future canonical Case event avoid parallel copies.

## Trust boundary

- `SOURCE FACT` is text explicitly present in a document.
- `NORMALIZED FACT` is a reversible representation and never replaces source text.
- `TEMPORAL LINK` orders explicit dates and does not assert causality.
- `INTERPRETATION` and `KAREN DECISION` are not implemented here.

Facts without coordinates or with extraction confidence below `0.90` are routed to `NEEDS_REVIEW`. Deterministic cross-document links require explicit source language on both sides; ambiguous links remain absent rather than guessed.

## Persistence and security

Migration `20260901180000_clinical_evidence_items.sql` creates service-only RLS tables and revokes `anon`/`authenticated` access. It is a repository artifact only. No production migration, worker integration, automatic client processing or raw Document AI response persistence was performed in Phase 2.5B.
