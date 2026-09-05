# Karen Review hardening

Date: 2026-09-05

## Problem observed in production

Case 480 proved that the connected projection rendered, but it exposed hundreds of extraction rows, repeated headers/footers and formatting-only disputes. The progress counter used only the lab timeline and therefore showed `0 / 0` while extracted evidence visibly required review. The client-conclusion approval action did not enforce completion of critical evidence review.

## Decision

The primary Karen view is a bounded clinical projection, not the raw extraction list. It shows up to 25 critical/important items, retains the full list behind an explicit drill-down, and records Karen decisions separately from source facts and Phase 2.7 trust.

Critical pending evidence blocks conclusion approval in both the UI and the server action. Client-side disabling is not treated as a safety boundary.

## General mechanisms

- Unicode, whitespace and bullet normalization prevents punctuation-only differences from becoming disputes.
- Exact semantic duplicates collapse without deleting source records.
- Generic independent notes are separated instead of compared as one field.
- Evidence priority comes from general section/label families; no Case-specific target value is embedded.
- Technical/demographic evidence remains available but does not clutter the primary view or block clinical approval.
- Every review action validates Karen role, Case ID, document ownership and current evidence membership before appending an internal note.

## Boundaries

- No source fact is overwritten.
- A Karen decision does not create `VERIFIED` evidence.
- No migration or production data backfill is required.
- No PHI fixture, screenshot or raw OCR response is committed.
- Production auto-verification remains NO-GO and Phase 2.9 remains open.
