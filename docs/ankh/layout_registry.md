# Ankh laboratory layout registry

2026-09-03: `real.minimized.synoptic.en.v1` and `real.minimized.mitotic.en.v1` are retained in tests/fixtures/clinical-real-minimized-v1.json. Actual Document AI tokens and normalized coordinates are retained without identifiers. Staging v2 fixes wrapped value rows and same-page headerless suppression. ER/PR/HER2 source rows remain review-only. Whole-parser 47-target coverage is 16/47, not a clinical accuracy measurement; the exact-value Gold gate remains open. The mitotic score-3 annotation is confirmed incorrect (source score 2).

> Phase 2.5C correction: Phase 2.5B real-layout “targets passed” entries below describe historical regex checks, not TypeScript extraction validation. The pathology target is disputed; no verified OCR-failure attribution is supported. See [Phase 2.5C report](phase_2_5c_report.md).

Phase 2.5C adds `synthetic.synoptic-geometry.en.v1` (headered/headerless cells, review-only source facts) and `synthetic.mitotic-score.en.v1` (explicit score syntax and ambiguity). Both are developer fixtures, not real-case statistics. Real-layout success/review rates remain unmeasured after hardening.

The layout registry is a QA/statistics registry, not a parser rule engine. Generic parsing remains authoritative; registry entries cannot change extraction behavior by themselves.

Each entry records layout ID/fingerprint, optional source label, language, structural characteristics, sample count, parser success/review rates, known failures and last validated parser version.

## Current development entries

| Layout | Characteristics | Samples | Success | Review | Status |
| --- | --- | ---: | ---: | ---: | --- |
| `synthetic.simple-table.en.v1` | test/result/unit/reference/flag | 1 | 100% | 0% | synthetic only |
| `synthetic.multi-page.en.v1` | two pages, continued table | 1 | 100% | 0% | synthetic only |
| `synthetic.ambiguous.en.v1` | low confidence, ambiguous association | 1 | 100% | 100% | synthetic routing test |

No real laboratory layout is registered yet. A real entry must be derived only from an approved deidentified sample and should accumulate statistics without exposing the laboratory report or identifiers.

Layout-specific rules require a documented generic-parser failure, a deidentified regression fixture and proof that the rule does not degrade other layouts.

## Phase 2.5B observed clinical layout families

These entries describe structure only and contain no patient identifiers or copied clinical conclusions. Statistics remain pending OCR/Gold comparison.

| Layout | Type | Characteristics | Samples | Status |
| --- | --- | --- | ---: | --- |
| `real.stlukes.breast-radiology.narrative.en.v1` | RADIOLOGY | letterhead, repeated identity header/footer, sectioned narrative, multi-page | 3 logical reports | OCR validated; text targets passed |
| `real.stlukes.surgical-pathology-synoptic.en.v1` | PATHOLOGY/BIOMARKERS | narrative final diagnosis, addenda, synoptic biomarker table, multi-page | 1 | OCR validated; 1 missed pathology fact; table objects 0 |
| `real.stlukes.image-guided-procedure.en.v1` | PROCEDURE | sectioned procedure narrative with later pathology addendum | 1 | OCR validated; source targets passed |

The source screenshots are identifiable and are not registry fixtures. Layout-specific parsing rules require a minimized coordinate-backed Gold artifact before activation.
