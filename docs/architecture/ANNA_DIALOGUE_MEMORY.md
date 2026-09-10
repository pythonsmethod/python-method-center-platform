# Anna dialogue memory and archive search — 2026-09-09

Before: separate shared-knowledge panel and only 40 automatically loaded notes. After: one founder chat, literal RU/EN remember/save commands and automatic full-archive lexical retrieval on ordinary questions.

Data: existing assistant_knowledge only; no migration. New entries are internal staff/general notes with the authenticated author. Existing shared visibility for Anna and Karen is retained. Inactive and client-only entries are excluded from archive retrieval. Existing clinical production gates remain unchanged.

Retrieval scans every page (200 records) in stable date/id order, retaining 12 top matches and at most 24,000 source characters. Latest 40 active entries provide background context. Stored notes are labeled as source data, not higher-priority instructions or verified clinical findings. Errors are not represented as a successful full search.

Scope: app/(admin)/admin/assistant/page.tsx; app/api/assistant/staff/route.ts; lib/assistant/{founder-memory,knowledge-search,knowledge,prompts}.ts; five new/updated memory/persona/page/search test files plus existing confirmation tests; vitest JSX configuration; CURRENT_STATE/DECISIONS/ROADMAP and this report.

Intentionally excluded from this release: unrelated local conversation-history overhaul, content-policy changes, clinical/OCR work, payments, migrations and bulk local workspace changes. Production history behavior is preserved; permanent knowledge is independent of the chat window history.

Limitations: lexical keyword matching, not semantic synonym search; full scans grow linearly with archive size. Relevance context is bounded, but source search is not restricted by age or first-page limits. No medical data was used in validation.

Validation and deployment results will be recorded after the isolated release checks.


Validation: full isolated regression ran 1,004 tests: 1,003 passed and one JSX test-runner configuration failure. After correcting the runner to OXC automatic JSX, all 22 focused tests passed, including the failed RU/EN page rendering test. TypeScript, ESLint and diff-check pass. Full rerun is not claimed. Remote production build compiled successfully; release completion is recorded below after domain verification.
