# PMC document chain — 2026-09-24

Owner direction: finish the eleven steps inside PMC; do not move to NEXORA. The old Case 2.9, its documents and real-data replays remain excluded. No existing client record was selected. Branch `fix/pmc-document-chain-20260924` is based on main `42b441d92ba9ca711c1ca7c4d3d99ee95fd1e673`, with the independent literal-data repair, instruction packages and source-bound review concept from PR #189. NEXORA migration PR #222 is not merged.

## Before and after

The existing worker read whole attachments, wrote extraction/lab/run state separately and lost progress on timeout. Source rows could disappear in presentation, and approval/publication lacked a complete version binding. This increment reuses existing PMC storage, Cases, extractions, runs, notes, learning events and messages.

| Step | Current implementation | Verification boundary |
|---|---|---|
| 1. Upload | Owner/Case/path checks; idempotent atomic document and job registration; readback; original retained on uncertain save | SQL tested; hosted browser upload remains pending |
| 2. Original | Original-byte SHA256, separate provider derivatives, immutable run snapshot; source overwrite denied | PDF/image and SQL tests; no bounding-box/token claim |
| 3. Preflight | MIME/byte validation, image decode/rotation, physical PDF page count, 25 MiB / 250-page bounds | Synthetic sources; no general clinical OCR accuracy claim |
| 4. Reading | Header checkpoint, physical page per lease, two independent reads, end marker, resumable progress, 90-second deadline | Truncation and retry guards; hosted provider read remains pending |
| 5. Facts | Raw values/readings and page/hash/excerpt retained; per-row printed dates/material/method; separate numeric projection | No document-wide date substituted for an explicitly unknown row date |
| 6. Review | Repeated captions cannot overwrite one another; uncertainty/date/reference differences preserved; optional correction on every row | Exact extraction/snapshot/token binding; no stale review transfer |
| 7. Labs | Explicit units only; ambiguous/censored/range values remain source-only; missing/different material/method blocks trends | Conservative comparison tests; human corrections do not silently rewrite normalized values |
| 8. ANHAM | One selected-Case paginated evidence tool for text/voice; synthesis includes saved Case context, current staff knowledge and authenticated speaker's Case history | Knowledge/history excerpts explicitly partial; no other staff member's private chat |
| 9. Internal synthesis | Internal wording, valid source references required, complete pending queue, source fingerprint checked before reads and during save | Oversized context rejected; no automatic diagnosis or approval |
| 10. Karen | Verified sign-in, exact draft timestamp/fingerprint, source-bound decisions, all pending disputes block approval | App tests and synthetic DB actor; legitimate hosted Karen session pending |
| 11. Client result | Separate explicit publication of saved approved text; one immutable linked message per approval; readback | Actual isolated DB path passed and rolled back; no real client message |

The provider boundary remains the existing PMC Claude attachment reader. No new external API/provider or NEXORA runtime is activated. Document/lab instruction packages and their 55 checks are retained contracts, not proof that every named ANHAM dependency or the entire v2 skill runtime exists.

## Reliability and access

- Lost HTTP acknowledgement after committed success reconciles to ready; stale leases cannot reset another worker.
- Extraction, numeric projection, immutable snapshot and ready state commit atomically; errors roll everything back.
- Queue schedule in code becomes every five minutes, with a bounded page budget. No existing hosted worker was invoked.
- Source/reading/review changes invalidate approval. Multi-query evidence reads check a stable fingerprint. Save success requires readback.
- Queries paginate past PostgREST's row cap; a failed page or 100,000-row ceiling returns unavailable. Internal synthesis has an explicit 180,000-character picture bound.
- New RPCs are invoker-rights and service-role-only. No client Case status, urgency or priority was added.
- Staging lacked the original-document bucket and retained permissive metadata policies. Added private source storage, own-Case upload, owner-only read, no overwrite and restrictive server-only document metadata writes. Existing permissive policies cannot widen these boundaries.

## Files and schema

Implementation: `lib/documents`, `lib/assistant`, `lib/analysis`, `lib/analytical-picture`, `lib/cases`, upload/process/source-view routes and the two Case review panels. Regression tests and a bounded synthetic workflow are included. `pdf-lib@1.17.1` is pinned for physical page inventory and derivatives; existing lockfile platform metadata is retained.

Four additive migrations, applied only to isolated staging `thylrayzjczsxlyqhtfc`:

1. `20260924012755_pmc_document_chain.sql`: job progress, raw values/source anchors, immutable snapshots, approval-linked messages and transactional RPCs.
2. `20260924015616_pmc_document_chain_settlement.sql`: real document-intake enum in retry/failure settlement.
3. `20260924020407_pmc_document_chain_lab_context.sql`: specimen/method context beside numeric projections.
4. `20260924021210_pmc_document_chain_source_boundary.sql`: private bucket and restrictive source policies.

Production `zdrfttgwnyorifmpqgwe` was not migrated. `tests/sql/pmc-document-chain-staging-smoke.sql` creates random synthetic identities/Case in a transaction, exercises registration through linked publication and rolls back all synthetic rows. It reads no existing Case and sends no email. Bucket/policy changes are persistent staging configuration.

## Validation

- `npm run test:pmc-document-chain`: **278 passed**, 21 files; source bytes, page coverage, dates/units, duplicate captions, review/approval binding, text/voice parity, localization and persistence.
- Included SQL portion: **13 passed**; real enum, atomic rollback, stale lease, lost success acknowledgement, immutable snapshot, idempotent publication and authenticated RLS against deliberately permissive legacy policies.
- Python document/lab contracts: **55 passed** on new synthetic fixtures.
- Compatible synthetic benchmark: **1 passed**, 3 synthetic documents / 4 pages, zero critical extraction errors, false-VERIFIED critical errors or security issues. Fixture regression, not a live OCR/provider trial.
- TypeScript, ESLint, security boundary check, production build and `git diff --check`: PASS. Existing CSS compatibility warning remains.
- Actual staging SQL smoke: PASS after all four migrations, with RPCs executed as `service_role`, followed by rollback. Bucket and restrictive policies inspected after source-boundary migration.
- Full historical suite: NOT RUN because excluded real-source fixtures are included. Existing full release workflow is unchanged. The new branch-only synthetic workflow is an additional bounded check, not a replacement production gate. Remote CI is separate from local results.

Legacy expectations were changed explicitly for the new conservative contract: no unit inference from reference ranges; retain raw evidence beside numeric rows; preserve historical source IDs; use SQL queue claims; bind table cells by headers/geometry instead of medical plausibility. No evidence threshold was weakened.

## Completion, limitations and next action

Implementation and isolated DB path are complete for this increment. Hosted application acceptance and production release are **NOT CLOSED**. Do not claim all eleven steps are accepted on the live site.

Vercel deployment connector returns `Tool deploy_to_vercel not found`; CLI is logged out. Observed staging deployment `dpl_CPwYYorG1UcaJB3ETAqqyn8qrM6V` still points to old `b0503cbb7a9c198cb87a119940cb985667c21990`, not this branch. Git CLI push lacks credentials; the connected GitHub write API is used for durable code storage.

GO: code review and exact-commit isolated PMC preview. NO-GO: production clinical activation, automatic VERIFIED, universal accuracy claims or the excluded Case. Next required gate: legitimate synthetic upload → actual provider read → source opening → save/reload correction → Karen approval → explicit client-visible result, RU/EN, on that exact preview. Browser fallback after the failed Vercel connector requires user approval under browser-access instructions; no browser session was assumed.
