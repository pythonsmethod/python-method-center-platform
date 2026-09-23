# NX-03.2 — Preserve document data and uncertainty

Date: 2026-09-23. Status: IMPLEMENTED / LOCAL CHECKS PASSED / NOT DEPLOYED.

## Work packet

- Owner: NEXORA document capability; current integration: PMC extraction and Karen evidence projection.
- Authorized outcome: begin the owner's eleven-step chain by preserving reliable data. Keep conflicting units and ambiguous dates visible without guessing or silently resolving review.
- Base: production/main `05581801c4bfea4598dbcd4f820bf3398ea20c2a`.
- Branch: `fix/document-data-integrity-20260923`.
- Related candidate: draft #222, head `ae4cf74b0d935e2051d169efc1a79ce0e9fd26b8`. The two affected runtime files and the two adjusted existing test files are unchanged from the base in that candidate; this narrow fix has no dependency on publishing #222. Reconcile documentation and rerun targeted tests when integrating.
- Data/environment: local pure-function tests and newly authored synthetic input; one existing explicitly synthetic development benchmark. No external model calls, live Case reads/writes or database migrations.
- Explicit exclusion: the old Case 2.9, its documents and its real-data fixtures/replays are outside this task. Historical roadmap text does not authorize resuming it.

## A–B. Failure and repair

The presentation layer discarded unit text while grouping readings. Two rows containing `5 mg/L` and `5 g/L` became one `SOURCE_ONLY` row, with no dispute reason. It also treated matching text and generic notes as a reason to clear review. Those transformations did not mutate stored raw readings, but hid evidence and uncertainty from Karen.

Presentation now only assigns evidence display priority, orders rows, and removes repeated occurrences of the identical row. It retains raw values, alternate readings, units, signs, source IDs, reasons, trust and human decisions. Similar text from different rows is not evidence of source identity or independent verification. A reviewed row does not hide a separate pending row. Generic note disagreements retain their original ID so a saved review refers to the same evidence.

The metadata parser unconditionally assumed day/month order for numeric dates, and accepted valid-looking substrings inside malformed or composite strings. Now ISO dates must match the entire field. Other supported numeric dates are tested in both day/month and month/day order and accepted only if there is exactly one valid calendar result. For example, `09/10/2026` stays unknown; `23/09/2026`, `09/23/2026` and `2026-09-23` resolve to the same date. A separator or language is not proof of a date convention. Same-day/month dates remain unambiguous. Unsupported formats remain printed-only.

All three date fields retain printed text. `reportDatePrinted` is added to new JSON headers; the type permits its absence in historical headers. The header prompt asks for literal date transcription without format conversion. Unknown collection dates remain null in lab values and cannot create a same-date version relationship.

## C–D. Files and persistence

- Runtime: `lib/assistant/metadata.ts`, `lib/analytical-picture/evidence-presentation.ts`.
- New regression: `tests/document-data-integrity.test.ts` (38 checks).
- Existing regression expectations: `tests/metadata.test.ts`, `tests/case-analytical-picture-live.test.ts`.
- Records: this report, `CURRENT_STATE.md`, `DECISIONS.md`, `ROADMAP.md` and the existing owner plan.
- No schema, storage, authorization, provider configuration or production data change. The existing worker already writes the complete parsed header to its JSON field. Original files and saved extraction rows are not rewritten by presentation.
- Existing stored dates are not retroactively repaired. That requires a separately bounded, authorized reconciliation against actual source evidence; it must not reopen the excluded Case.

## E–F. Exact validation

1. Before the fix, the new 38-check suite had **24 failures / 14 passes**, reproducing unit/sign/scale loss, hidden review reasons and guessed dates.
2. After the runtime fix, all **38 new checks passed**. Four existing expectations failed because they explicitly expected the old guessing/coalescing behavior. They were updated to assert the owner's conservative data contract; those failures were not hidden.
3. Final related regression: **102 passed / 0 failed**, seven files: document-data-integrity, metadata, identity, pipeline, case-analytical-picture-live, document-processing and document-timeline. It includes stored extraction → presentation → Karen queue and metadata → lab-date/version-relation integration with synthetic inputs. No HTTP, provider or production job was invoked.
4. `npm run typecheck`: PASS. `npm run lint`: PASS. `git diff --check`: PASS.
5. Existing compatible `npm run benchmark:ankh` on `synthetic-development`: **1 passed**, 3 synthetic documents / 4 pages; zero critical extraction errors, false-VERIFIED critical errors or security issues. This is regression evidence only, not a new OCR/provider trial or real-world accuracy estimate. Output was redirected to scratch to leave saved benchmark artifacts unchanged.

The full historical suite was not run: it includes real-source fixtures outside the owner's permitted scope. The repository's automatic pull-request workflow unconditionally runs that suite. This increment is therefore saved as a reviewable remote branch without opening a PR or claiming full CI. Existing workflow rules are not altered or bypassed. Before a later release, establish an approved validation scope and run its required gates.

## G–I. Boundaries and limitations

- No client document, identifier, secret, model request or real-client message used or exported.
- Clinical precision, multilingual OCR and the complete upload-to-review workflow remain unaccepted. Production auto-verification stays NO-GO.
- Karen may see more pending evidence because unresolved differences are no longer hidden. Resolving them belongs to evidence verification or a source-bound human review, not display formatting.
- Ambiguous dates with dots are conservative too. Textual months, timestamps and composite fields currently stay printed-only; a proven format adapter can later resolve them without assuming document language proves numeric ordering.
- No new date adjudication UI, provider integration, queue repair, precise page/region provenance, client-response publication or migration of chat/voice in this increment.
- Signed-in hosted RU/EN, save/reload and source-view acceptance: NOT RUN. Existing UI copy and route switching are unchanged; this is not a browser acceptance claim.

## J–L. Completion and next action

The bounded local implementation is complete. Production deployment and end-to-end clinical acceptance are NOT CLOSED. GO for code review and a permitted synthetic hosted acceptance; NO-GO for calling the eleven-step chain complete or automatically promoting evidence to VERIFIED.

Next: review this narrow branch; verify the same two scenarios in the correct Karen role on a newly selected synthetic document in an isolated, confirmed environment. Keep the old Case excluded. Then take the separate upload → queue reliability task from the eleven-step audit.
