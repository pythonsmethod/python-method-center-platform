# Phase 2.9 — Broader Real-World Validation

Status: IN PROGRESS — DATA GATE OPEN

Date started: 2026-09-03

## Purpose

Measure extraction and the unchanged `phase-2.7-shadow-v1` trust policy across multiple real Cases, layouts, document types, languages and source quality levels. Synthetic fixtures remain regression evidence and are never counted as real-world validation.

## Proposed entry and release-decision gates

Protocol status: PROPOSED, NOT YET APPROVED.

- at least 5 authorized, minimized/deidentified real Cases;
- at least 15 real documents;
- independent source review for every real Case;
- at least 5 layout families;
- English and Russian coverage;
- PDF text, scan and mobile-photo sources;
- laboratory, radiology, pathology and procedure documents;
- high, medium and low quality bands;
- at least one corrected report or addendum;
- exact token/span provenance for every evaluated target;
- zero false auto-verified facts under the unchanged policy.

These numbers are a conservative engineering proposal for review. They are not an approved clinical, product or production release policy. The implementation accepts an explicit requirements object and does not hard-code them as canonical truth.

## Current readiness audit

Artifact: `output/ankh-benchmark/phase-2-9-readiness-audit.json`

Current real evidence:

- real Cases: 1;
- independently reviewed real Cases: 0;
- logical real documents: 5;
- languages: English only;
- exact P3 provenance: 6/47 targets;
- false auto-verified: 0.

Only the zero-false-auto-verified gate currently passes. Phase 2.9 cannot be closed from the existing one-Case corpus. The earlier eight images cannot establish broader validation even if processed again.

## Data handling protocol

For every authorized Case:

1. process in the isolated validation environment;
2. capture only the minimum exact token/span provenance needed for Gold and regression;
3. record source type, language, quality band, layout family and document version kind;
4. obtain independent source review and record disagreement/adjudication;
5. run the unchanged shadow policy;
6. delete temporary images and full raw OCR responses;
7. retain only minimized/deidentified Gold and benchmark artifacts;
8. verify deletion before closing the validation run.

Before any document is processed, its metadata must pass the repository intake contract in `lib/verification-trust/validation-intake.ts`. The contract requires a non-PHI Case alias, an authorization reference scoped to Phase 2.9, deidentification/minimization status, unique document IDs, source profile and an explicit independent-review field. It stores no document contents.

Production PHI processing, production auto-verification and Phase 3 production remain NO-GO.

## Validation Case 002 — provisional intake (2026-09-05)

Owner authorization was recorded for three one-page Russian/bilingual laboratory documents in the isolated validation scope. The repository retains only neutral document aliases and a 34-observation deidentified regression shape covering biochemistry, immunoassay and CBC tables. No patient identity, source filename, accession, contact detail, source image or raw OCR response is stored in Git.

The general parser now recognizes expanded/bilingual Russian headers, comma decimals, bounded references, common CBC/thyroid analyte labels, Cyrillic/common laboratory units and explicit high/low flags. The 34/34 fixture result is regression evidence only: exact Document AI token/span replay and independent reviewer adjudication are still absent, so this Case is not yet counted as complete real-world evidence and Phase 2.9 remains open.

## Validation Case 003 — provisional intake (2026-09-05)

The owner authorized isolated Phase 2.9 processing of 15 mobile-photo documents. Existing production readings are read-only validation input: 616 first-pass fragments, 592 second-pass fragments, 212 literal agreements and 693 literal disputes. The set spans laboratory tables, blood gas/electrolytes, abdominal/renal ultrasound, phlebology/Doppler, echocardiography, pathology and thyroid ultrasound.

The audit identified presentation fragmentation as a general comparison failure: one clinical observation may be emitted as separate result, unit and reference rows, or as one combined row in the other pass. `coalesceTranscriptionFragments` now reassembles only suffix-explicit fragments with the same file, section and exact base label before comparison. It never aligns rows by position, never drops orphan fragments and never promotes uncertainty. A unique exact label may also match across differently named sections, but repeated labels are deliberately refused to prevent cross-section swaps.

Source review exposed two additional general failure classes. Explicit empty markers (for example, `не заполнено`, `нет записи` and `пусто`) are now excluded from fact comparison, while uncertain handwriting remains review-visible. Untouched printed forms can also contain complete mutually exclusive option lists that both readers copy identically; known option-list shapes are therefore forced to uncertain unless a single selected value is transcribed. Regression coverage includes all three mechanisms.

Manual source review completed for the laboratory sheets, discharge summary, pathology, two usable ultrasound forms, thyroid ultrasound and both echocardiography pages. Key numeric values and narrative conclusions matched the source where the source was legible. Three uploaded images (the lower portion of one handwritten ultrasound and most of two phlebology/Doppler pages) are themselves cropped/greyed and cannot support independent adjudication; their extracted text remains `NEEDS_REVIEW`. Minimized Gold metrics remain pending, so this provisional intake does not close Case 003 or Phase 2.9.

The handwriting hardening pass adds an explicit non-clinical coverage row to each independent reading (`COMPLETE`, `PARTIAL`, `UNREADABLE`) and character-level instructions for handwriting, abbreviations, signs, decimals and units. A partial word is retained with an uncertainty marker instead of being completed from medical context. If either reader sees an incomplete source, otherwise matching visible rows remain disputed with reason `источник виден не полностью`. This improves safe extraction from handwritten documents but deliberately does not claim recovery of pixels absent from the uploaded image.

Owner adjudication established that one apparent failure was an identity-only empty copy of a printed form beside a separately uploaded filled copy. The general fix classifies a document as `EMPTY_TEMPLATE` only when both readings contain no clinical content after excluding coverage metadata, identity/header rows, explicit empty markers and unresolved printed option lists. Empty templates retain audit readings but create no evidence/review rows. Filled copies are never merged with empty copies. Re-encoded duplicate photographs require an exact deidentified fingerprint of agreed clinical rows plus matching accession or laboratory/date metadata; otherwise the relation fails open as a new document for review.

The structured contract is supplemented by a bounded visual check for image uploads. When both OCR passes contain only structured `UNCERTAIN`/empty clinical rows and no clinical `FILLED` row, the detector measures chromatic ink separately in the header and body. Header-only ink can corroborate `EMPTY_TEMPLATE`; body ink or any weak, monochrome or decoder signal remains reviewable. The detector does not read handwriting and cannot promote evidence to `VERIFIED`.

New OCR passes also emit an explicit row-state enum. Provider notes are explanatory only: `EMPTY` and `UNSELECTED_TEMPLATE` are excluded from evidence, `FILLED` is clinical outside administrative sections, and `UNCERTAIN` always remains reviewable.

## Validation Case 004 — comparison-noise hardening (2026-09-06)

The owner authorized processing an existing production Case with six clinical image documents. The first production pass produced 20 literal agreements and 258 review rows. A structural audit showed that 114 rows were intentionally held because the source was partial, seven because at least one reader was uncertain, 108 were one-sided presentation/label differences, and 29 carried different rendered values. These are queue counts, not a count of medical errors.

The comparator now ignores presentation-only prose punctuation while preserving numbers, decimal points and clinical operators. It also accepts a unique, mutual, same-section label match when the labels differ only by the Cyrillic/Latin spelling of `pH` or by one OCR character in a sufficiently descriptive label. Different numeric identifiers are never fuzzy-matched. Ambiguous, repeated, cross-section, partial-source and uncertain candidates remain review-visible; the trust policy and production auto-verification boundary are unchanged.

No source image, raw reading, patient identifier or clinical value from this Case is retained in Git. The production replay result is recorded only as aggregate counts after deployment.
