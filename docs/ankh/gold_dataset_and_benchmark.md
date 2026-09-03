# Ankh Gold Dataset and benchmark — Phase 2.5

Status: benchmark infrastructure and synthetic development baseline implemented. Real-world validation is blocked because no approved deidentified real laboratory documents are available. This is not a production-readiness claim.

## Environment and staging audit

The repository has one generic Supabase environment contract (`NEXT_PUBLIC_SUPABASE_URL`, anon key and service-role key) and no committed staging/dev project identity. There is no `supabase/config.toml`, local Supabase CLI, staging-specific environment file, or documented isolated migration target. The canonical migration therefore was not applied to any remote database.

Google Document AI is configured around the `pythons-ankh-analysis` project, but there is no separate production/staging processor split. Only synthetic data was used during earlier OCR validation. Production uploads are not automatically included in this benchmark.

Safe validation performed in Phase 2.5:

- static migration/RLS/constraint tests;
- in-memory staging harness mirroring extraction-run and fact idempotency keys;
- synthetic persistence/read-back test preserving provenance and statuses;
- no production database writes.

## Gold Dataset contract

The machine-readable schema is `tests/fixtures/gold-dataset/gold-dataset.schema.json`. TypeScript contracts are in `lib/canonical-facts/gold-dataset.ts`.

Gold truth is stored separately from `outputFacts`. Every document declares:

- stable document and layout IDs;
- `real_deidentified` or `synthetic_development` dataset kind;
- language, source type, page count and layout classes;
- explicit visible-text, filename and embedded-property deidentification review;
- truth observations with page, analyte, original/numeric/text value, comparator, unit, reference bounds, laboratory flag, collection date, optional coordinates, parseability and expected verification route;
- provider latency and estimated cost inputs.

Synthetic fixtures can test infrastructure but never satisfy the real-world release gate.

## Deidentification gate

Before a real document enters the dataset, all three checks must be completed:

1. visible identifiers removed or replaced;
2. filename reviewed;
3. PDF/image embedded properties and metadata reviewed.

Do not commit names, DOB, MRN/patient IDs, addresses, phones, email, account identifiers or production storage paths. A `deidentified: true` declaration is required but does not replace human approval of the source document.

## Benchmark runner

Run:

```text
npm run benchmark:ankh
```

The command writes `output/ankh-benchmark/synthetic-baseline.json` and prints a short summary. The report includes dataset/provider/parser versions and timestamp. `compareBenchmarkReports()` reports metric regressions and critical/false-VERIFIED error deltas between parser versions.

Metrics implemented:

- critical numeric/comparator exact match;
- analyte name, unit, reference, flag and collection-date accuracy;
- row association and provenance availability;
- VERIFIED precision and NEEDS_REVIEW recall;
- missed, false and duplicate observation rates;
- document full-pass rate;
- latency per page/document;
- estimated provider cost per page/document.

## Critical Extraction Error policy

Critical errors change the meaning or ownership of a fact: wrong number/decimal/sign/comparator, unit, reference association, date, source page/provenance or row association. A critical error on a `VERIFIED` fact also produces `FALSE_VERIFIED`, the highest-risk defect class.

Error-library categories:

`OCR_VALUE`, `OCR_UNIT`, `ROW_ASSOCIATION`, `REFERENCE_PARSE`, `DATE_PARSE`, `PROVENANCE`, `NORMALIZATION`, `DUPLICATE`, `FALSE_VERIFIED`, `MISSED_FACT`.

Confirmed extraction defects must receive a deidentified regression fixture, discovery parser version and eventual fixed version. The first infrastructure run found one Gold annotation mismatch (an expected LOW flag absent from the ambiguous source fixture); Gold truth was corrected. It was not classified as a parser error.

## Measured synthetic development baseline

Dataset: `ankh-synthetic-development@1.0.0` — 3 synthetic documents, 4 pages, 7 observations.

| Metric | Result |
| --- | ---: |
| Critical numeric exact match | 7/7 (100%) |
| Analyte name accuracy | 7/7 (100%) |
| Unit accuracy | 7/7 (100%) |
| Reference interval accuracy | 7/7 (100%) |
| Laboratory flag accuracy | 7/7 (100%) |
| Collection date accuracy | n/a (no dated observation in this small suite) |
| Row association accuracy | 7/7 (100%) |
| Provenance availability | 7/7 (100%) |
| VERIFIED precision | 6/6 (100%) |
| NEEDS_REVIEW recall | 1/1 (100%) |
| Missed / false / duplicate rate | 0% / 0% / 0% |
| Document full-pass rate | 3/3 (100%) |
| Latency | 506.67 ms/document; 380 ms/page (fixture inputs, not live provider measurement) |
| Estimated marginal OCR cost | $0.002/document; $0.0015/page (configured estimate, not invoice data) |
| Critical extraction errors | 0 |
| False VERIFIED critical errors | 0 |

These numbers validate the runner and Phase 2 regression suite only. They are not real-world accuracy metrics.

## Local staging end-to-end result

The safe local path covered:

```text
synthetic extracted row
→ parser/verification/canonical facts
→ in-memory staging persistence
→ read-back
→ benchmark comparison
```

Reprocessing returned the same extraction ID and left one run/one fact. Bounding polygon, page, `NEEDS_REVIEW`, normalization and comparability statuses survived read-back. No analysis or medical interpretation was invoked.

The live `Test document → Google Document AI` portion was already smoke-tested in Phase 1, but a fresh real-document E2E benchmark was not run because approved deidentified documents do not exist in the workspace.

## Release gates

Before Phase 3 receives a GO based on extraction quality:

- build an approved `real_deidentified` dataset covering the target layout classes;
- run the benchmark against actual Google Document AI output;
- establish risk-based metric thresholds from measured results;
- have zero known systematic numeric/comparator/unit/association defects;
- demonstrate ambiguous-row routing and provenance on supported layouts;
- run migration/persistence checks in an isolated Supabase project;
- fail CI on key-metric or false-VERIFIED regressions.

Current recommendation: **NO-GO for Phase 3 real-world/production data use**. Phase 2.5 infrastructure is ready to receive a real deidentified dataset, but synthetic metrics cannot establish clinical-document extraction quality.

Exact next action: provide an owner-approved set of correctly deidentified real laboratory documents with filenames and embedded metadata reviewed, and identify an isolated Supabase staging project. Then ingest Gold truth separately, run the same benchmark, set measured release gates and perform real staging persistence verification.

## Phase 2.5B real clinical Case

An owner-provided Case now covers radiology, procedure, pathology and biomarker layouts. Its source screenshots contain direct identifiers and remain outside Git. The consent boundary supplied with the task permits task-scoped use, but the existing repository PHI production gate is not thereby closed.

The benchmark contract is being extended through the separate Clinical Evidence model rather than forcing narrative facts into `canonical_lab_facts`. A real Gold subset must contain only minimized evidence and coordinate references; raw OCR responses and original images remain transient. Exact real-case metrics are intentionally not reported until the isolated Document AI run and manual coordinate-backed truth review are complete.

### Measured first-Case result

The isolated run completed for 8 screenshots representing 5 logical documents. The minimized coordinate-backed Gold set contains 47 facts: 46 matched (97.8723% recall), provenance was present for 46/46 matches, document classification was 5/5, and NEEDS_REVIEW routing was 3/3. One pathology score was missed. Document AI emitted zero table objects across all eight screenshots, including the biomarker-table pages. Exact category metrics are stored in `output/ankh-benchmark/real-clinical-case-summary.json`.

These metrics describe one consented task-scoped Case and are not a production-readiness or general clinical-accuracy claim. The release recommendation remains NO-GO pending table fallback, regression coverage, a broader real layout set and the PHI production gate.
