# Google Document AI synthetic live check — 2026-09-17

Before: Vercel Preview to Google WIF credential exchange passed; actual Document AI processing had not been demonstrated by this smoke.

Change: a button on the existing admin-only Preview diagnostic page invokes a Server Action. It rechecks staff authorization, exact staging deployment hostname and staging database URL, Preview environment, same-origin request and PHI=false. It accepts no source file or source URL. A fixed authored one-page PDF is constructed on the server and processed through the existing Google adapter and short-lived WIF credentials. General OCR flags are not enabled. No schema or client-data change.

Files: lib/document-extraction/synthetic-google-smoke.ts, app/(admin)/admin/anham/wif-smoke/{page.tsx,actions.ts,SyntheticTest.tsx}, tests/synthetic-google-smoke.test.ts, scripts/security-check.mjs. Network inventory review covers only passing the fetch dependency to the existing reviewed OCR adapter, not a new direct network call.

Live deployment: https://anham-clinical-staging-oqd9zgr9z-pythonsmethods-projects.vercel.app/admin/anham/wif-smoke

Commit: 3f8ded7. Vercel deployment 4PyVQmyHv9JC2hiRWktUzbdWcpLz: Ready; build 1m 4s.

Fixed processor: projects/pythons-ankh-analysis/locations/us/processors/2ca773b0daa15488 (default version; not version-pinned).

Source SHA-256: d845240248d986f6863e0d1054bd9d20c82937b2d496b045ae1e86a32b288675.

Live receipt: ok=true; 1 page; 6/6 line checks matched; 29 tokens, 29 with text-anchor and bounding-poly fields; syntheticDocumentSent=true; phiSent=false; clinicalValidation=false.

Expected rows matched:

- ANHAM SYNTHETIC OCR TEST
- NO PERSONAL OR MEDICAL DATA
- ITEM VALUE UNIT RANGE
- ALPHA 12.34 mg/L 10.00-20.00
- BETA 0.05 g/L 0.01-0.09
- GAMMA 1234 count 1000-2000

Comparison trims/collapses whitespace and otherwise requires complete matching OCR lines. It does not validate reading order, table-cell association, polygon correctness, handwritten text, multilingual sources or clinical interpretation. The PDF is clean digital text, not a scanned/raster fixture. No clinical benchmark claim follows from this result. Token provenance reports field availability, not independent geometric validation.

Validation: 15/15 focused tests, full regression 1826 passed and 1 skipped (202 files passed and 1 skipped); TypeScript, scoped ESLint, security self-test (6), security inventory and diff check pass. Production dependency audit: 0 vulnerabilities. Existing synthetic clinical regression reports no critical extraction or false-VERIFIED errors; that result is independent of this live transport test.

No permanent credential, PHI, client document, database migration, auto-verification or production activation. One actual synthetic processing request; page refresh alone does not invoke OCR. Repeated admin button clicks can cause further billable requests; no durable idempotency record was added for this diagnostic. The UI disables its button while pending.

Synthetic Google processing smoke CLOSED. GO for a harder synthetic raster/table fixture and a version-pinned benchmark; NO-GO for claiming clinical accuracy or universal production readiness. Next: extend the test dataset with table geometry, decimal commas, comparators, rotated images and deliberately degraded scans, then measure row/column association against independently specified expectations.
