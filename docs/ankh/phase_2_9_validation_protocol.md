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
