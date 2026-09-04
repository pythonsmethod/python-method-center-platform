# Karen Case Analytical Picture — live bridge

Status: internal staff UI integration. Production auto-verification remains off.

## Architecture

The screen is a read-only Case projection, not another Case, fact or analysis store. It reads the production layers that are currently available:

`uploaded_documents + lab_values + latest analysis_runs + admin_notes → Case Analytical Picture → Karen`

This is a conservative live bridge toward the approved chain:

`documents → OCR → Canonical Facts / Clinical Evidence → Trust Decision → Evidence Package → Case Analytical Picture → Karen`

The production schema does not yet persist the newer Canonical/Clinical Evidence Package and Clinical Trust Decision layers. The bridge therefore never labels a live fact VERIFIED. Resolved `lab_values` are `NEEDS_REVIEW`; unresolved values are `SOURCE_ONLY`. Provenance is honestly limited to the source document because the live schema does not retain page/token provenance.

## Safety and comparison rules

- Queries are Case-scoped and cross-Case fact/document input is rejected.
- A comparison is accepted only from the latest analysis run when that run is not older than the current documents.
- Comparison evidence must be linked to that run, contain at least two facts, usable dates and one resolved canonical unit.
- A significant threshold result is only `POTENTIAL_CHANGE`; Karen determines clinical meaning.
- Unit/date/source mismatch becomes `NOT_COMPARABLE` or `INSUFFICIENT_DATA`.
- Existing blockers, exclusions, missing dates and absent page/token provenance remain visible.
- No OCR/LLM call, document retransmission, diagnosis, client response or automatic approval occurs when the screen opens.

## Karen notes

The screen reuses service-only `admin_notes`. Notes are internal (`karen_and_admin`) and append-only through this UI. Staff may save a draft; only an address authorized as Karen may mark a note confirmed. A confirmed note is still a review note, not a client response and not an automatic Case decision.

## Remaining gap

This screen does not claim the full clinical chain is live. A later approved staging/production task must connect persisted Canonical Facts, Clinical Evidence, Evidence Packages and Clinical Trust Decisions with exact page/token provenance. Phase 2.9 remains open.
