# Доступ Анхама к данным сайта / Anham site-data access

2026-09-09. Latest implementation report; supersedes the narrow site-tool scope
in `realtime_voice.md`, D-057. Local code and synthetic validation only.

## A. Before / До изменения

Voice had three specific read operations: registration counts, today's incoming
messages and one incoming message. Founder could read support only, Karen could
read Professor/support. Existing source data elsewhere on the site was inaccessible
to voice. Live transcript/history persistence already existed.

The owner explicitly requested all site/client information for both herself and
Karen. That instruction authorizes the broader private assistant read policy.

## B. Changed / Что изменилось

Both authenticated, allowlisted staff personas can discover and retrieve all
catalogued business sources through the voice conversation. The server does not
trust a body-supplied persona. Clients/guests receive no staff data tools.

| Operation | Behavior |
| --- | --- |
| `site_data_catalog` | Source directory; selected source returns fields, keys, relationships and cautions |
| `query_site_records` | AND filters, literal text search, selected fields, sort, exact total/count-only and 10-row pages |
| `read_site_field` | Full stored text/JSON in 10,000-character chunks; revision hash detects changes between chunks |
| `summarize_site_records` | Complete grouped counts/decimal sums, up to 5,000 matches and 100 groups; broader requests must narrow filters |
| `read_site_content` | Actual RU/EN page/navigation/legal/shop/pricing modules; runtime configuration-presence flags without secret values |
| Three prior inbox/count helpers | Retained for convenience; both staff personas may read either inbox |

Catalog: **46 datasets**, covering every current public business table except
retired `escalation_events` and internal `assistant_usage` abuse-counter buckets.
The regression checks all catalog fields against migrations and fails if a new
table is neither catalogued nor explicitly excluded.

Coverage includes:

- People, contacts, delivery details, Cases, onboarding and health questionnaires.
- Document inventory, existing first/second/agreed/disputed readings, processing
  jobs, laboratory rows, analysis runs, AI drafts, team notes and Karen review history.
- Professor/support messages in both directions and all dates; saved assistant
  conversations across clients/staff (automatic chat restoration remains isolated).
- Payments, support periods, delivery tasks, volunteers, referrals, reward ledger,
  shop waitlist, consent/audit/notification/payment-event headers.
- Measurement/sleep/supplement diaries, chess games/coaching conversations and appointments.
- Team knowledge, book/method collections, literature digest and published site content.
- Optional canonical facts, clinical evidence, provenance, trust and human calibration
  records. Their presence in the catalog does not mean their staging schema is live.

The model is instructed to look up a person first, resolve duplicate names before
using a person's records, follow existing profile/Case/document keys, and read
additional pages/chunks when needed. Source-specific answers require retrieval.
Open-Case ID is a hint, not a substitute for a different client named by the user.
The browser permits up to 12 tool rounds, three calls per round; the existing
server cap is 60 reads per signed session. Stop discards late responses.

Business records remain read-only. Sensitive data releases require a successful
minimal append-only audit entry. No reading marks a message read or triggers
file extraction, payment, delivery change, message sending or clinical approval.

## C. Files / Файлы

Created: `lib/assistant/site-data-catalog.ts`, `lib/assistant/site-data-tools.ts`,
`tests/site-data-tools.test.ts`, this report.

Updated: `lib/assistant/voice-site-tools.ts`, `realtime-server.ts`,
`realtime-contract.ts`, `realtime-turns.ts`,
`app/api/assistant/realtime/tools/route.ts`,
`tests/realtime-api.test.ts`, `tests/voice-site-tools.test.ts`,
`tests/fixtures/realtime-ui/main.tsx`, `docs/ankh/realtime_voice.md`,
`CURRENT_STATE.md`, `DECISIONS.md`, `ROADMAP.md`.

Synthetic artifacts: `output/realtime-regression.log`,
`output/voice-broad-data-ru.png`, `output/voice-broad-data-mobile-ru.png`.
No real client data is in these artifacts.

## D. Data/schema / Данные и схема

No new migration, table, role, clinical store or schema change in this increment.
The earlier repository-only voice-history migration is still unapplied.

The existing `audit_logs` receives `assistant.site_data.read` with authenticated
actor/persona, source, operation and at most 20 selected record IDs. Filter field
names/operators may be recorded, not values/names/message bodies. Aggregates
record the source/operation without duplicating all source rows. Audit failure
prevents releasing data to the model. Business tables are never changed.

Session receipts now sign `dataAccessVersion=2`; tools reject older policy receipts.
The expanded start disclosure describes external transmission of requested site,
client, questionnaire, correspondence and medical-record data in RU/EN.
An already admitted old session cannot silently inherit the expanded permission.

## E. Tests / Проверки

- Full regression: **131 files passed, 1,096 tests passed**, no failures;
  `npm test`, final full run 19.50 seconds.
- Final focused voice/site suites: **118 tests passed across 6 files**.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0, no ESLint warnings/errors.
- `git diff --check`: exit 0; only Git LF/CRLF conversion notices.
- Vite reports its existing native-config future-compatibility advisory, not a
  compilation/test failure. No unrelated failures were reproduced.

Coverage: source/field coverage against migrations; broad access for both staff
personas; client denial; raw SQL/unknown fields/secret columns/retired-state denial;
literal names, missing values, exact counts and pagination; complete long reads and
revision changes; source originals/uncertainty/provenance; database/audit failure;
complete grouped sums/counts, currency separation, null sums and unsafe-integer
rejection; active-locale content, runtime flags without credentials; old receipt
denial and existing voice authentication, transcript, interruption and history tests.

Browser fixture: `http://127.0.0.1:4173/?chat=1&broad=1` imports the actual chat,
voice component and controller. Microphone/WebRTC/fetch are synthetic and unexpected
requests fail. RU and EN both verified a questionnaire question, `query_site_records`
call with a profile filter, returned-source reply in the same chat and saved text.
RU→EN→RU preserved the route; 390px viewport had `scrollWidth=390`, no error overlay.
This verifies orchestration/UI, not live model planning, speech recognition or DB RLS.

## F. Benchmark

No extraction/trust algorithm changed. The full suite ran the existing synthetic
benchmark: 3 documents / 4 pages; numeric exact match, verified precision, review
recall and provenance availability 100%; critical errors, false VERIFIED critical
errors and security issues 0. These metrics do not validate general clinical or
live voice accuracy. No PHI, actual OCR, provider request or real Case was used.

## G. Security/PHI / Безопасность

Scope is the two existing explicitly allowlisted private staff identities, not
every staff account. D-058 records the owner's intentional expansion of founder
access through Anham, including Professor correspondence and existing medical data.
The direct Professor-message UI permission remains unchanged; no client-facing
permissions or automatic medical decisions are expanded.

The source catalog does not expose auth schemas, passwords, tokens, keys, bank/card
data, processor payloads, raw provider errors/responses, signed/private storage URLs,
notification payloads, raw audit metadata or retired Case/support classification.
No wildcard table/column selection, raw SQL, arbitrary joins/RPC or write tool exists.
New data sources require code review, not model-selected schema discovery.

Returned content is explicitly untrusted data. Originals, normalized values,
confidence, verification state, page/region/token provenance, AI drafts and Karen
decisions remain distinct. A shadow verdict never promotes production evidence.
Prompts instruct the model to report missing sources, ambiguity, unavailable tables
and incomplete coverage honestly; prompt instructions are not a deterministic
guarantee of model behavior and require live adversarial validation before release.

Real records may contain PHI and would be transmitted on a relevant staff request.
The feature remains OFF by default. No real PHI or credentials were read or transmitted
in this task; no production gate, external provider retention review or deployment
authorization is completed by these code changes.

## H. Limitations / Ограничения

- “Any question” means answer from actually available retrieved source data, not
  omniscience. Sources absent from the database remain unavailable; errors are not zero.
- Existing extracted document text is readable. Unprocessed/failed documents and
  audio-only messages are not newly downloaded, transcribed or processed by a read.
- New/changed schema can differ between environments. Missing tables/columns fail
  closed; one unavailable dataset does not prevent querying other datasets.
- Long fields use explicit chunks/revisions. List/aggregate requests across pages
  are not transactional snapshots; changes can affect results. Aggregation checks
  count changes/duplicates and never reports a deliberately sampled partial sum.
- Aggregates over more than 5,000 rows or 100 groups require narrower filters.
  Grouped payment sums are per currency. Numeric values that cannot be represented
  safely are rejected; the service never silently rounds an unsafe money integer.
- Website content reflects bundled application modules. Runtime flags report only
  configured presence, not uptime, actual provider health, billing or external dashboards.
- The broad tools are connected to live voice. The existing typed assistant provider
  route and its static Case prompt have not been rewritten into a generic tool agent.
- Real microphone/provider behavior, staging authentication/database execution,
  ambiguity resolution and injection resistance have not been tested live.
- Earlier voice limitations (client-reported transcripts, pending-write loss on
  failed page exit, browser-enforced duration, no server hard spending ceiling) remain.

## I. Intentionally not implemented / Намеренно не реализовано

Production deployment/enabling, key creation, billing changes, new migrations,
raw file/audio extraction, arbitrary SQL, server-side voice proxy, write actions,
auto-verification, diagnoses/treatment, automatic client replies or typed-provider
architecture changes. Clinical phase ordering is unchanged.

## J. Phase status / Закрытие

Broad retrieval implementation and synthetic validation: **CLOSED**.
Real voice/staging acceptance and production release: **NOT CLOSED**.

## K. GO / NO-GO

**GO** for separately authorized isolated staging acceptance with synthetic records.
**NO-GO** for production voice/PHI activation based solely on this local report.

## L. Exact next action / Следующее действие

In an authorized isolated staging environment, use the existing provider credentials
and earlier voice-history migration to test actual founder/Karen tool calls over
synthetic client records: name disambiguation, Case/evidence linkage, both inboxes,
long document reading, financial grouping, unavailable source/audit failure,
injected source instructions, old-session policy denial and persistent voice history
in RU/EN. Confirm provider/privacy/budget gates before any production activation.
