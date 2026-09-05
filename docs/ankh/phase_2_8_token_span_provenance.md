# Phase 2.8 — P3 Token/Span Provenance & Verification Upgrade

Status: COMPLETE FOR THE LOCALLY RETAINED, MINIMIZED CORPUS

Date: 2026-09-03

## Purpose

Phase 2.8 adds a provider-neutral exact provenance chain without changing the Phase 2.7 trust policy:

fact → document → page → region → exact tokens/span → parser → trust decision.

The implementation does not change source facts, stored verification states or normalized values.

## Implemented

- Google Document AI normalization now retains deterministic token IDs and single-segment text anchors.
- Clinical Evidence supports P3 token provenance with token IDs, token bounds, optional document text span, exact source text hash and minimum token confidence.
- Exact matching accepts only one contiguous token sequence. Missing, repeated, malformed or non-contiguous matches remain P2 with an explicit reason.
- Spatial-table evidence retains its parser-native supporting token set as P3 while remaining `NEEDS_REVIEW`.
- P4 requires a separate relation validation marked both independent and passed. P3 is never promoted merely because parsing succeeded.
- The Verification Trust adapter consumes real P0–P4 provenance and leaves unavailable confidence dimensions null.
- A repository-only migration adds nullable provenance storage to canonical and clinical facts. It was not applied to production.

## 47-target replay

Policy: `phase-2.7-shadow-v1` (unchanged)

Artifact: `output/ankh-benchmark/phase-2-8-provenance-benchmark.json`

This is a provenance-isolation replay. Non-provenance confidence values and deterministic checks are controlled constants inherited from the Phase 2.7 harness, not new empirical measurements. Therefore its 0/47 trust outcome confirms policy behavior but is not a new precision estimate.

Result:

- P3: 6/47 (`h_mitoses`, `h_er`, `h_er_pct`, `h_pr`, `h_her2`, `h_method`)
- P2: 41/47
- P4: 0/47
- policy blockers: 41 missing exact token provenance; 6 exact P3 mappings below the class-required P4 level
- shadow auto-verified: 0/47
- false auto-verified: 0
- `NEEDS_REVIEW`: 46/47
- `SOURCE_ONLY`: 1/47
- production mutation: none

The six P3 targets are the only benchmark targets whose exact Document AI token sets survived in the minimized real regression fixture. Full raw OCR responses were intentionally deleted during the earlier PHI cleanup. The remaining 41 targets were not upgraded from region provenance because no retained source token set can prove an exact mapping.

## Safety conclusion

Phase 2.8 closes the provenance implementation gap and proves the stop rules. It does not establish production auto-verification coverage. Broader validation must capture minimized exact token/span provenance at extraction time so additional evidence classes can be evaluated without retaining full raw OCR responses.

Production auto-verification and Phase 3 production remain NO-GO.
