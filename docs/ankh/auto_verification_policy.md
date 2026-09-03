# Auto-verification policy

Policy version: `phase-2.7-shadow-v1`. Production auto-verification is OFF.

## Decision rule

The policy evaluates separate OCR text, layout, field parse, source provenance, normalization, cross-check, document quality and context-association dimensions. No aggregate score can compensate for a failed mandatory dimension. Missing signals fail closed.

`VERIFIED` in a shadow decision requires every class-specific threshold, required deterministic check, required provenance level, a genuinely independent passing cross-check, one unambiguous candidate and an unambiguous source. The stored fact remains unchanged. `NEEDS_REVIEW` retains usable structured evidence with insufficient trust. `SOURCE_ONLY` retains an ambiguous narrative or relation without claiming structure. Existing rejected input remains `REJECTED`.

## Provenance

- P0: document only.
- P1: document and page.
- P2: document, page and region.
- P3: exact token or character-span support.
- P4: P3 plus independently reconstructed or validated association where the evidence class requires it.

The current real Case is P2. Region boxes are not token provenance.

## Evidence-class gates

Policies live in `lib/verification-trust/policies.ts` as versioned declarative data. Numeric labs require value/unit/label checks and P3. Reference ranges require separation from the measured value. Biomarkers, radiology measurements/categories, pathology scores, procedure facts, dates, laterality/site and document relations require P4 because association changes clinical meaning. Narrative source facts require P3 and exact-span cross-check; ambiguity routes to SOURCE_ONLY.

Minimum defaults are OCR 0.98, field parse 0.98, provenance confidence 0.98 and document quality 0.90. Layout/context thresholds are stricter where associations matter. These initial thresholds prioritize precision and are not tuned to the single 47-target Case.

## Deterministic checks

Applicable policies require numeric parsing, unit/value separation, value/reference separation, label/value association, date/event association, laterality/site association, idempotency, source existence, schema constraints and contradiction detection. A missing required result counts as failure.

## Cross-checks

Allowed interfaces are independent parser, spatial reevaluation, exact-source-span verification and a future second OCR provider. A repeated invocation of the same logic over the same representation must set `independentSignal=false` and cannot satisfy the gate. No additional OCR provider is connected in Phase 2.7.

## Reason codes

The contract includes low OCR/layout confidence, ambiguous row association, missing P2/P3 provenance, value/reference conflict, unit/date/laterality uncertainty, unresolved normalization, second-pass disagreement, source ambiguity, low document quality and generic unmet policy requirement. Decisions retain failed gates and reason codes.

## Versioning and history

Every decision stores the policy version and evaluation timestamp. A new threshold set requires a new version. Re-verification appends a decision; it does not rewrite history. The staging migration adds append-only decisions, immutable policy versions and a separate human-review calibration table. It is not applied to production.
