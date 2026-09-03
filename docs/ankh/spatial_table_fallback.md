# Spatial table fallback — staging v2

Status: staging v2, synthetic and minimized real regression coverage. Full-page OCR replay completed on 2026-09-03; the independent 47-fact exact-value gate remains open. See phase_2_5c_report.md. This is not an enabled production ingestion worker.

`extractClinicalDocumentEvidence` combines text extraction with `extractSpatialEvidence`. Callers supply normalized tokens and an explicit `structuredTablesSufficient` assessment. Provider table adequacy is not inferred from a nonzero count. The adapter does not consume/log raw provider payloads or perform network requests.

## Reconstruction and safety

- Reject missing, pixel-only, degenerate, non-finite or out-of-range geometry. Group within each page by vertical overlap; order tokens left-to-right.
- Header-confirmed tables require at least two separated semantic header anchors and two complete rows. Header positions define column bands. A large vertical gap or another header terminates a table.
- Known synoptic labels plus a repeated stable value-column gutter can produce headerless candidates alongside other tables on the same page. Already claimed rows are excluded. Right-column continuations are retained for review; repeated Test(s) Performed separators do not erase preceding rows. No institution, patient, source sentence or expected numeric value selects a layout.
- Missing cells and boundary crossings remain explicit review issues. Possible wrapped values are retained with reduced layout confidence. Headerless/wrapped associations are not automatically trusted.
- OCR confidence is the minimum token confidence; missing confidence remains null. Layout confidence is a heuristic score, **not a calibrated probability**: clean header geometry .95; missing/crossing .65; wrapping/headerless .70.
- Cell polygons enclose all contributing tokens; fact polygons enclose both label and value. Original tokens remain in the returned table. This is not the old first-overlapping-token shortcut.
- All reconstructed clinical evidence remains NEEDS_REVIEW, even when row geometry alone is high confidence. Percentage/intensity statements without a marker remain source statements, not inferred ER/PR associations. IHC/ISH/FISH/method text is retained, not interpreted.
- Exact source-equivalent text/table biomarkers are deduplicated. Unrelated narrative facts are retained. No schema migration or production worker is activated.

## Counters

`table_objects_missing_but_fallback_used` is a per-document 0/1 flag; `spatial_rows_reconstructed`, `spatial_rows_needing_review`, `layout_reconstruction_failures`, and `pathology_pattern_misses` are observed counts. `false_verified_count` and `benchmark_regression_count` remain null until an independent truth comparison exists. Never initialize truth-dependent metrics to zero merely because extraction returned successfully.

## Limits

Synthetic coverage does not validate the actual screenshot geometry. Rotated/skewed layouts, merged cells, interleaved side-by-side tables, multiple headerless and headered tables on one page, and split label/value baselines require broader validation. Headerless inference intentionally stops at an unrecognized line. Wrapped marker association is not resolved automatically. Generic source-label/value output is not a complete structured biomarker ontology. Existing text-only extraction retains its previous verification behavior; the new spatial review gate must not be presented as a global verifier rewrite.

## Reproduction

Run `npx vitest run tests/clinical-real-regression.test.ts` for the four additional real-source and mixed-layout regression checks. The real JSON contains an intentionally limited source region, not an entire deidentified document. Full source-pattern coverage results are separate from this fixture benchmark.

Run `npx vitest run tests/clinical-hardening.test.ts tests/clinical-evidence.test.ts tests/canonical-facts.test.ts tests/gold-benchmark.test.ts tests/gold-benchmark-report.test.ts tests/document-extraction-provider.test.ts`, then `npm run typecheck`, `npm run lint`, and `npm test -- --reporter=dot`.

Fixtures `tests/fixtures/clinical-hardening-v1.ts` are authored synthetic examples, not reconstructed real OCR. For real replay supply sanitized source tokens (text, page, normalized polygons, confidence) and independently checked expected facts with IDs/values/routes and full supporting token IDs. A coordinate-only match audit is insufficient.
