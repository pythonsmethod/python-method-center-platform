# Connected Ankh in-memory harness

Status: local development and tests only. Production, persistence and external providers are OFF.

Date: 2026-09-05

## Route

`NormalizedDocumentExtraction -> Clinical Evidence -> Phase 2.7 shadow Trust Decision -> Evidence Package -> Case Analytical Picture`

The harness consumes the provider-neutral output already produced by `GoogleDocumentAIProvider.normalize_response()`. It never calls `process_document()`, Supabase, the production document worker, an OCR provider or an LLM.

## Isolation contract

- environment must equal `IN_MEMORY_TEST`;
- `externalCallsAllowed` must be `false`;
- `persistenceAllowed` must be `false`;
- every document must carry the same non-PHI Case alias;
- repeated source-document/version pairs are rejected;
- raw provider payloads are not returned by the run;
- no production endpoint is imported or invoked.

No test database was used. The repository does not contain evidence that an available Supabase project is isolated from production, so migrations and writes were intentionally skipped.

## Safety behavior

- Clinical extraction uses the closure path and begins review-only.
- Missing exact provenance remains missing.
- Identity/version/type/source conflicts remain explicit.
- The unchanged `phase-2.7-shadow-v1` policy evaluates every candidate.
- Evidence Package applies monotonic transition audit with no promotion evidence.
- Case aggregation preserves effective trust and never diagnoses or establishes causality.
- Missing units, event dates and source content are surfaced instead of inferred.

## Source-to-candidate integrity hardening

The harness reconstructs an immutable source observation from the normalized
document page and exact token IDs/span when that anchor is uniquely available.
Candidate value, unit, date, row and reference signals are evaluated against
that separate observation. A missing or ambiguous anchor is explicitly not
evaluated and fails closed; the candidate is never compared with itself.

This verifies the extraction/transformation boundary only. It is not an
independent reread of the original image and does not prove that OCR text is
clinically correct.

Confidence remains nullable. Text presence does not manufacture field-parse
confidence, and detected anatomy does not manufacture context-association
confidence. Checks distinguish `PASSED`, `FAILED` and `NOT_EVALUATED`.
Reference/value separation is `NOT_EVALUATED:NO_SOURCE_REFERENCE` when no
source reference signal exists; it is never a synthetic PASS.

Synthetic candidate overrides exist only inside this isolated harness to prove
that changed numbers/decimal semantics, units, dates, rows and references are
detected against the unchanged source. A request for `VERIFIED` remains blocked
without new qualifying promotion evidence.

## Development screen

`/ankh-test?locale=ru` and `/ankh-test?locale=en` render the same synthetic run. The route returns 404 unless both conditions hold:

1. `NODE_ENV=development`;
2. `ANKH_HARNESS_ENABLED=true`.

The screen labels the material synthetic and displays source IDs, evidence classes, original synthetic values, page/provenance level, trust, contradictions, missing context and Karen review count.

## Boundaries

This does not close Phase 2.9, add a real Case, validate clinical accuracy, exercise a database, authorize PHI processing, generate a diagnosis/recommendation, create a Karen decision or prepare a client response.
