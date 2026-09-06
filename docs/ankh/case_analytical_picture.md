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

## Karen Review hardening — 2026-09-05

The primary screen is now bounded to at most 25 critical or important clinical rows. Technical/demographic rows and the complete extraction stay available in a closed drill-down; source storage is unchanged.

Formatting-only differences are normalized for comparison, exact duplicates are collapsed, and unrelated generic note rows are preserved separately instead of being reported as one clinical contradiction. These presentation rules do not change source evidence or trust state.

Karen can append `CONFIRMED`, `CORRECTED` or `REJECTED` decisions for a Case-scoped evidence reference. This remains a Karen decision, not a Phase 2.7 Trust Decision, and never promotes evidence to `VERIFIED`. The latest decision drives progress while earlier decisions remain in `admin_notes`.

The conclusion approval UI and server action fail closed while any critical evidence row remains pending. This gate confirms completion of Karen review, not clinical correctness.

## Remaining gap

This screen does not claim the full clinical chain is live. Exact page/token provenance and persisted Clinical Trust Decisions remain absent. A new extraction version creates new evidence references and therefore a new review requirement. Phase 2.9 remains open and production auto-verification remains NO-GO.

## Exception-only review projection — 2026-09-06

The complete extraction is now an audit archive, not a click-by-click Karen
checklist. The primary surface is an exception queue. It contains unresolved
non-technical disagreements first and a bounded amount of important matched
context second. Pending exceptions sort ahead of already reviewed ones.

Formatting-equivalent rows and complementary dual-read rows may be collapsed
only inside the same document and label when every non-empty normalized result
agrees. For example, `243 / empty` plus `empty / 243 [10^9/L]` becomes one
source-only observation. `243 / 248` remains review-required. A previously
recorded Karen decision is preferred as the representative so append-only
review history is not hidden by projection deduplication.

Matched/source-only and technical rows remain inspectable in the archive but
have no decision controls. The screen reports unresolved exception, non-blocking
and technical-archive counts in both Russian and English. None of these
presentation rules promotes evidence to `VERIFIED`.
