# DECISIONS.md — ANKH ANALYSIS SYSTEM

## 2026-09-09 — Same client tools in text and voice

The owner expanded the selected client's pilot beyond the registered/paid
assistant tier to include all implemented client-facing read capabilities.
Use a separately reviewed 17-section own-record projection, never the staff
catalog. Bind record/list reads to authenticated profile and own Case, retain
source attribution, chunk revisions, quota and audit checks. Internal notes,
AI clinical drafts, secrets and other clients remain excluded. Read existing
document extractions only; no automatic extraction or clinical gate promotion.

Reuse public-query-only web search with cited results, request-local text tool
authority and session-bound voice provenance. Authenticated confirmed pilot
access is rechecked by server routes; body claims never grant tools. All public
queries exclude full Case context by construction, but identifier-pattern filters
and model generalization are defense in depth, not a universal PHI detector.
Source links are appended server-side to successful text answers and saved in
the existing conversation history. No new Case, schema or paid-service grant.

## 2026-09-09 — Full client assistant preview is not paid support

Owner requested full client functionality for Elena's own-Case pilot. Reuse the
existing server-managed pilot allowlist and require auth.getUser-confirmed email
for the expanded client assistant tier. Apply it consistently to UI, text and
voice; do not create payments, service periods, staff access or a new Case model.
Source context explicitly labels preview access as not proof of payment/support.
The earlier registered-tier restriction is superseded for confirmed pilot users.
Revocation removes this assistant-only grant. Existing client safety and staff
tool exclusions remain. See docs/ankh/elena_full_client_assistant.md.

This file records architectural decisions that must survive chat/thread changes.

Last canonical update: 2026-09-09. New decisions are appended with a new ID; historical decisions are not silently rewritten. If a decision is superseded, record the replacement and reference the prior ID.

---

## D-001 — Google Document AI is the initial primary OCR provider

Decision:
Use Google Document AI Enterprise OCR as the first production-oriented extraction provider.

Why:
- successful initial benchmark;
- good OCR quality on current materials;
- page/layout/token information;
- provider adapter already implemented.

Constraint:
Architecture remains provider-independent.

Do not hard-wire the entire platform to Google.

---

## D-002 — Do not trust one OCR output blindly

Decision:
OCR output is not automatically truth.

A fact moves through:
SOURCE → EXTRACTED → VERIFIED → NORMALIZED.

Why:
OCR can misread numbers, units, columns or dates even with high confidence.

---

## D-003 — Double OCR is selective, not mandatory

Decision:
Do not run two OCR providers for every field.

Second-pass verification is reserved for:
- low confidence;
- critical facts;
- layout ambiguity;
- conflicting evidence;
- quality-control sampling.

Why:
Two OCR systems can agree on the same wrong image; consensus is not proof.

---

## D-004 — Primary evidence is the source document

Decision:
The strongest evidence for an extracted fact is the original source region/span, not AI agreement.

The system must preserve source provenance.

---

## D-005 — Canonical facts do not overwrite originals

Decision:
Store original and normalized representations separately.

Why:
International units, languages and mappings can be wrong or revised later.

---

## D-006 — LOINC/UCUM are future standardization layers, not forced mappings

Decision:
Do not assign a standard code when mapping is uncertain.

Prefer unresolved over incorrect.

---

## D-007 — Lab reference flag is not clinical significance

Decision:
`HIGH/LOW` is stored as a laboratory/source fact.

It does not automatically mean:
- disease;
- importance;
- severity.

Trend/context will be evaluated separately.

---

## D-008 — Trend can matter even inside reference range

Decision:
Future analytical logic must detect meaningful change over time, not only red flags.

---

## D-009 — Do not model the body as rigid organ boxes internally

Decision:
UI may use familiar groups such as liver/kidney/hematology.

Internal reasoning should allow one fact to participate in multiple physiological processes.

---

## D-010 — Association is not causality

Decision:
Ankh may identify:
- sequence;
- temporal association;
- co-occurring change.

It must not automatically claim:
“X caused Y”.

---

## D-011 — Non-lab clinical evidence gets its own layer

Decision:
Radiology, pathology, procedures and biomarkers must not be forced into `canonical_lab_facts`.

Clinical Evidence layer exists for source-grounded non-lab facts.

---

## D-012 — Generic extraction mechanisms over Case-specific patches

Decision:
Do not create one rule per missing benchmark target.

Failures must be grouped by root cause/mechanism:
- table;
- key-value;
- narrative;
- measurement;
- date;
- layout;
- schema gap;
- linkage.

---

## D-013 — Safe review routing is a correct result

Decision:
`NEEDS_REVIEW` is not failure.

If evidence cannot be safely auto-verified, correct behavior is review routing.

---

## D-014 — SOURCE_ONLY is allowed

Decision:
Some evidence should remain source-only rather than being forced into a structured relation.

Example from real Case:
`b_path_link` remained source-only.

---

## D-015 — 47/47 source match does not mean 47/47 automatic trust

Decision:
Phase 2.5C achieved exact source match for 47 selected targets under visual review.

All 47 remained review-only.

This must not be presented as production auto-verification accuracy.

---

## D-016 — Region provenance is not token provenance

Decision:
The current system can have region provenance without exact P3 token/span provenance.

Never claim full token provenance unless exact source span/tokens are actually linked.

---

## D-017 — Verification policy is conservative by design

Decision:
Phase 2.7 shadow policy `phase-2.7-shadow-v1` yielded:
- 0/47 auto-verified;
- 0 false auto-verified.

This is acceptable.

Do not weaken the policy merely to increase coverage.

---

## D-018 — Confidence is multidimensional

Decision:
Do not collapse trust into one opaque OCR score.

Keep separate:
- OCR text confidence;
- layout confidence;
- field parse confidence;
- provenance confidence;
- normalization confidence;
- cross-check confidence;
- document quality;
- context association confidence.

---

## D-019 — Trust decisions are a separate auditable layer

Decision:
Trust decisions do not rewrite source or canonical facts.

They are:
- explainable;
- policy-versioned;
- append-only/auditable.

---

## D-020 — Shadow mode before production auto-verification

Decision:
Auto-verification logic must first run in shadow mode.

Shadow mode:
- predicts whether a fact would be auto-verified;
- does not change stored verification state;
- is compared with reviewed Gold/human outcomes.

---

## D-021 — One Case is not enough for production claims

Decision:
No universal accuracy or production-readiness claim can be based on one Case.

Broader multi-layout, multi-document validation is required.

---

## D-022 — Human review calibration must be independent

Decision:
Visual checking by the same workflow/implementer is useful source verification but is not called “second independent human review”.

Future calibration dataset should record reviewer identity/role and disagreements.

---

## D-023 — Production PHI processing remains gated

Decision:
Explicit real-Case validation authorization does not automatically enable general production PHI processing.

Production requires separate compliance/security/operational readiness.

---

## D-024 — Temporary PHI artifacts are cleaned up after isolated validation

Decision:
Do not leave temporary client images/raw OCR responses in Cloud Shell or Git after authorized benchmark tasks when they are no longer required.

Retain only minimized/deidentified benchmark artifacts where appropriate.

---

## D-025 — Current next blocker is P3 token/span provenance

Decision:
Do not tune Phase 2.7 thresholds next.

First improve provenance:

fact
→ document
→ page
→ region
→ exact token/span
→ parser
→ trust decision

Then rerun the unchanged shadow policy.

---

## D-026 — Phase 3 may start only as conditional test architecture

Decision:
Phase 3 architecture may begin on non-production/test data only if it:
- preserves trust states;
- does not flatten NEEDS_REVIEW into fact;
- carries evidence/provenance forward.

Phase 3 production remains NO-GO.

---

## D-027 — Karen interface must become simpler as backend becomes more complex

Decision:
The system may have many validation layers internally.

Karen should see:
- main picture;
- changes;
- unresolved issues;
- missing data;
- evidence when requested.

Do not expose every internal confidence value by default.

---

## D-028 — Client output is a separate presentation layer

Decision:
The client does not receive the technical Karen screen.

Client communication focuses on:
- what was reviewed;
- what changed;
- what appears stable;
- what cannot be concluded;
- next approved step.

---

## D-029 — Karen corrections do not automatically become methodology

Decision:
Classify corrections:
- Case-only;
- extraction error;
- mapping/unit/timeline error;
- methodology proposal;
- existing-rule refinement;
- client-language correction.

Methodology changes require controlled approval and scope.

---

## D-030 — Project memory belongs in the repository

Decision:
The persistent project context must live in:
- `AGENTS.md`;
- `CURRENT_STATE.md`;
- `ROADMAP.md`;
- `DECISIONS.md`;
- canonical docs.

Do not rely on a ChatGPT/Codex thread as the only memory of the project.

After meaningful work, Codex must update these files.

---

## D-031 — Existing Case architecture remains canonical

Decision:
Ankh extends the existing `client_cases`, uploaded-document and processing foundations. It must not create a parallel Case record, processing state machine, role system or competing source of truth.

The retired client processing classification must not be reintroduced through Ankh.

---

## D-032 — Layer boundaries remain explicit

Decision:
Keep `SOURCE`, `EXTRACTED`, `VERIFIED`, `NORMALIZED`, `INTERPRETATION`, `KAREN DECISION` and `CLIENT RESPONSE` separate.

A value moving between layers requires an explicit transformation or decision record. Later layers never overwrite source evidence.

---

## D-033 — Exact provenance matching fails closed

Decision:
P3 is assigned only when a fact maps to one unique contiguous source token sequence or to a parser-native exact token set.

Missing, repeated, non-contiguous or geometrically invalid candidates remain P2 with an explicit reason.

Gold agreement and region coordinates do not substitute for exact tokens.

---

## D-034 — P4 requires independent relation validation

Decision:
Parser success, high OCR confidence and an exact P3 token set do not by themselves establish P4.

P4 requires a separate relation validation that is both independent of the originating parser signal and passed.

---

## D-035 — Minimized benchmarks retain exact provenance at extraction time

Decision:
Future authorized real-world validation should retain the minimum token IDs/spans, hashes, geometry and confidence needed for regression testing while deleting full raw OCR responses and temporary PHI artifacts.

Do not reconstruct missing token provenance after cleanup or retain a full raw provider response merely for convenience.

---

## D-036 — Synthetic fixtures do not count as real-world validation

Decision:
Synthetic and authored deidentified fixtures may test mechanisms and regressions, but they never increase the real Case, real document or independent-review counts in Phase 2.9.

---

## D-037 — Broader validation requires cohort diversity

Decision:
Do not close Phase 2.9 by repeatedly processing the existing eight images from one Case.

A release-decision audit requires multiple authorized real Cases, independent source review, varied layouts, languages, source types and quality bands, corrected/addendum coverage, exact provenance and controlled false-auto-verification risk under the unchanged policy.

Numeric cohort thresholds remain a proposed protocol until explicitly approved; they are not an architectural fact.

---

## D-039 — Evidence Package is a projection, not a new fact store

Decision:
Use one provider-neutral Evidence Package to compose references and snapshots from the existing immutable source, Canonical/Clinical fact, provenance and Trust Decision layers. Do not add a parallel Case, fact, workflow or trust table.

---

## D-040 — Trust promotion is monotonic and evidence-bound

Decision:
A downstream stage may preserve or lower trust. It may raise trust only after a new independent source/OCR signal or a predefined deterministic gate passes, with all integrity checks passing and no unresolved source contradiction. Rephrasing, confidence, repeated summaries, LLM consensus and AI critique are not promotion evidence.

---

## D-041 — AI critique is a one-way safety mechanism

Decision:
AI critique may find problems and lower trust. It cannot independently produce VERIFIED evidence or satisfy an independent cross-check. A selective second-OCR plan is not authorization to transmit PHI.

---

## D-042 — The whole-client picture is a projection over Evidence Packages

Decision:
The Case picture orders evidence, compares only like with like, surfaces contradictions and missing context, and carries source/trust references. It does not infer diagnosis or causality and never promotes trust during aggregation.

---

## D-043 — Connected development harness is in-memory and fail-closed

Decision:
Until a database is independently proven non-production, the connected Ankh harness runs only in memory, with external calls and persistence disabled by contract. Its development screen is unavailable outside `NODE_ENV=development` plus an explicit local enable flag. Synthetic connectivity does not count as real-world validation.

---

## D-044 — Connected integrity compares candidates with immutable normalized source

Decision:
The connected harness reconstructs a source observation from normalized page
tokens/spans when a unique anchor exists. Candidate value, unit, reference,
date and row signals are checked against that separate observation, never a
copy of the candidate. Missing or ambiguous anchors are `NOT_EVALUATED` and
fail closed.

Text presence and anatomical context do not manufacture confidence. This check
validates extraction/transformation behavior only; it is not an independent
reread of the original image and cannot prove OCR correctness.

---

## D-045 — Handwriting recognition is source-coverage gated

Decision:
Handwritten medical content is read in two independent character-level passes. Each pass must first declare the source image `COMPLETE`, `PARTIAL` or `UNREADABLE`. Coverage metadata is not a clinical fact. If either pass reports a partial or unreadable source, matching visible text remains review-only; agreement cannot reconstruct content hidden by cropping, folds or uniform image regions. Printed option lists without one explicit selection are also review-only.

---

## D-046 — Empty templates and content duplicates are different relations

Decision:
An identity/header-only medical form with no filled clinical field is retained as an immutable source but classified `EMPTY_TEMPLATE`; it produces no clinical facts and no Karen review queue. A filled copy of the same template is a separate clinical document and is never merged with the empty copy. Byte-identical files remain duplicates. Differently encoded photographs may be content duplicates only when their deidentified agreed clinical fingerprints match and accession or laboratory/date metadata also match.

---

## D-047 — Structured OCR row state is authoritative

Decision:
New transcription passes emit `FILLED`, `EMPTY`, `UNSELECTED_TEMPLATE` or `UNCERTAIN` for every row. Empty-form classification uses this enum instead of free-form provider notes. Historical readings remain replayable through the conservative fallback; `UNCERTAIN` remains reviewable.

---

## D-048 — Visual fill evidence may only lower an empty-form false positive

Decision:
A provider-neutral visual detector may corroborate an empty printed form by locating chromatic ink in the identity/header area and proving its absence from the clinical body. It runs only after two structured OCR passes disagree with empty-form classification because of `UNCERTAIN` clinical rows. It must not suppress any clinical row marked `FILLED`, must not treat monochrome or weak visual evidence as absence, and must fail closed as `INCONCLUSIVE` on decoding errors. Visual evidence changes whole-document routing only; it never creates, edits or verifies a clinical fact.

---

## D-049 — Comparison normalization is bounded and mutually unique

Decision:
Independent readings may ignore presentation-only punctuation and may align a one-character OCR variant of a sufficiently descriptive label only when the relation is unique in both directions, remains inside the same section, and preserves every numeric identifier. Cyrillic/Latin `pH` is an explicit orthographic equivalent.

The comparator must not fuzzy-match across sections, repeated labels, different dates/indices, protected clinical designators (for example IgG/IgM, ALT/AST or T3/T4), partial sources or uncertain readings. Value comparison still runs after label alignment, and clinically meaningful operators remain significant.

Why:
Formatting and harmless label OCR differences should not inflate Karen's queue, but reducing review load must never manufacture agreement between different medical observations.

---

## D-050 — Bare printed state words require a visible selection signal

Decision:
When a mixed ultrasound/form field contains a bare printed state such as `норма`, `увеличен`, `повышена` or `понижена` before entered dimensions, that state is not an agreed fact unless the reading records a visible selection signal (underline, circle, check mark or equivalent). If selection cannot be distinguished from the printed template, the whole observation remains review-visible.

Concrete measurements followed by an assessment, and explicitly marked choices, remain eligible for comparison. The source wording is never deleted or rewritten by this gate.

---

## D-051 — Operator-triggered reprocessing is Case-scoped and audited

Decision:
Karen/admin may explicitly requeue all active documents in one existing Case
for a new two-pass reading. The source uploads remain unchanged, the operation
is written to the audit log and every interactive worker request may claim
work only from that Case.

Why:
A global “process next” call can consume another client's older queued job and
makes a controlled validation replay impossible to attribute. Case scope keeps
the authorized PHI operation bounded without creating a second queue or Case
model.

Constraint:
Reprocessing replaces derived extraction/analysis rows through the existing
idempotent pipeline. It does not promote evidence trust, approve Karen
decisions or enable production auto-verification.

---

## D-052 — Case reprocessing resumes the existing queue

Decision:
The interactive runner refreshes the Case only after its bounded queue pass.
If navigation, connectivity or a provider call interrupts the pass, staff may
resume the documents that are still queued without requeueing completed files.

Why:
A refresh after every document can unmount the client runner and cancel the
remaining loop. Requeueing the whole Case to recover would duplicate provider
work and make operational progress misleading.

Constraint:
Resume claims only already queued documents in the selected Case through the
same staff-authorized endpoint. It does not create new source data or alter
the trust state of extracted evidence.

---

## D-053 — Unselected standalone template states are not evidence

Decision:
A bare printed form option such as `норма` in a dimensions, echogenicity,
structure or contour field is excluded from Clinical Evidence unless the
reader records an unambiguous visible selection mark.

Why:
Independent readers can segment the same mixed printed/handwritten field
differently: one may attach the template word to entered measurements while
another emits it as a standalone value. Neither representation proves that
the printed option was selected.

Constraint:
The raw transcription remains immutable. Concrete measurements, trailing
assessments and visibly selected options remain eligible for review; this
rule does not infer clinical normality.
The exclusion covers agreed rows and disputes only when every non-empty side
is the same kind of unselected standalone template state. Any concrete
alternative keeps the dispute visible.

---

## D-054 — Manual identity confirmation is separate and auditable

Decision:
An automatic document identity mismatch remains immutable evidence and blocks
full extraction by default. An authorized admin/Karen may separately confirm
that explicitly listed files belong in the existing Case after human review
(for example, a former surname). The confirmation records actor and time, is
written to the audit log and permits only those files to enter the existing
Case-scoped reprocessing path.

The confirmation does not rename the profile, rewrite the printed header,
erase mismatch reasons, mark a clinical fact VERIFIED or apply to future
uploads.

Why:
Repeatedly requeueing a confirmed former-name document otherwise reproduces
the same safe stop. Silently changing identity data or globally weakening the
resolver would be unsafe.

---

## D-055 — Karen reviews exceptions, not the entire extraction archive

Decision:
The two-read comparison layer may remove presentation noise and collapse
complementary rows only when they belong to the same document and normalized
label and every non-empty normalized result agrees. These rows remain
`SOURCE_ONLY`; they are not promoted to `VERIFIED`.

The mandatory Karen queue contains unresolved, non-technical disagreements.
Matched/source-only and technical rows remain visible in an audit drill-down
without confirmation controls. A real value disagreement remains in the queue,
and critical unresolved evidence continues to block conclusion approval.

Why:
Making Karen click every OCR row does not scale and confuses extraction volume
with uncertainty. The correct human role is adjudicating exceptions, not
repeating deterministic comparison work.

Constraint:
This is a presentation and routing decision. It does not authorize automatic
medical verification, diagnosis, client interpretation or trust-threshold
weakening. Existing append-only Karen decisions remain authoritative and are
preferred when projection-level duplicate rows are collapsed.

---

## D-056 — Realtime voice is a scoped conversation channel, not clinical evidence

2026-09-09: reuse `assistant_messages` for completed, fully played voice turns,
with explicit client/founder/Karen scope, locale, unverified voice source and
idempotent exchange IDs. Server-verified identity and the existing private role
allowlists determine the scope; signed receipts bind writes to that session.

Use an authenticated server SDP handshake; no provider credential reaches the
browser. The initial release is an OFF-by-default non-sensitive test-account
pilot. Do not transmit saved history, documents, clinical snapshots or knowledge
memory automatically. No raw audio is retained by the application.

Client-reported transcripts are not provider-attested facts or Karen decisions.
Browser session controls/prompts are not server-enforced clinical guardrails or
hard spending limits. Live production/PHI acceptance requires a dedicated review;
local synthetic tests alone cannot authorize it. See `docs/ankh/realtime_voice.md`.

---

## D-057 — Live readable voice and permission-scoped operational queries

The narrow inbox permission below is superseded by the owner's explicit D-058
requirement. Transcript/day-boundary/history principles remain in force.

2026-09-09: extend D-056 persistence: show recognized user words immediately and
assistant transcript deltas in the same chat. Store available interrupted text
with `voice_state=interrupted`; never label unplayed text as fully spoken. A
recognized user-only turn is valid history. Failed recognition is not guessed.
Staff history uses sequence cursors to load older messages beyond the first page.

Offer only named read operations to founder/Karen: exact current client-profile
counts, incoming messages today, and one incoming message's full text. Resolve
the existing role on the server on every call. Founder cannot read private
Professor correspondence, including through the single-message operation; Karen
defaults to Professor and may explicitly request support. Clients have no tools.

The signed session contains the browser IANA timezone. Day boundaries account
for DST; returned data states date, channel, source, pagination/truncation and
query time. Missing data or errors are unknown, never zero. Guest sender counts
describe a support conversation rather than a verified unique person. Queries
do not mark messages read, sign audio URLs, send messages or mutate Case state.

Tool bodies/names are untrusted source correspondence, never instructions or
verified evidence. The start disclosure explains external transmission of
requested authorized information. No bulk documents/snapshots/history is loaded.
Server checks receipts, current access, kill switch and shared tool-use limit;
the browser bounds tool rounds and discards late results after Stop. Local tests
do not authorize production PHI use or attest model compliance to prompt rules.

---

## D-058 — Both private staff personas can retrieve all catalogued business data

2026-09-09: the owner explicitly requested access to all site/client information
for both herself and Karen, not only registrations or a restricted inbox. This
supersedes the assistant-specific founder/Professor restriction in D-057 and is
an explicit exception to the older default support/medical-substance separation
for this private assistant read surface. It does not widen guest/client access,
change direct UI permissions or confer clinical decision/write authority.

Reuse the existing verified founder/Karen identity and service-only data layer.
One reviewed catalog covers 46 business datasets and lists actual allowed fields,
keys, dates and evidence cautions. Generic named operations query/count/filter,
page through records, read complete long fields and compute bounded grouped
counts/decimal sums. Published page/legal/shop/pricing data comes from the same
modules the site renders. Optional canonical/trust tables remain unavailable
when not migrated; a catalog listing never claims they are deployed.

No arbitrary SQL, schema discovery, credentials, private file URLs, raw provider
payloads, internal abuse-counter buckets or retired classification are exposed.
No new Case/evidence/role store is created. Source facts, normalized values,
confidence/provenance, AI drafts and Karen decisions retain their separate fields.
No auto-verification, diagnosis, recommendation or client response is generated
as an authoritative clinical act. Reads do not trigger extraction or mutate records.

Every data release requires minimal append-only audit success, recording the
actor, source, operation and selected record IDs without duplicating body text or
search values. Existing server receipt/access/kill-switch/session-cap checks apply.
The expanded disclosure is RU/EN; signed data-access version 2 prevents an older,
narrower-disclosure session from acquiring broad access without a new start.

The change remains OFF by default and locally validated with synthetic data.
Real speech, live provider/database acceptance and production PHI authorization
remain separate gates. See `docs/ankh/voice_site_data_access.md` for the exact
coverage, tests, limitations and next action.


## D-059 — Public internet search during staff voice conversations (2026-09-09)

The owner explicitly requested internet search for voice Anham. Reuse existing
founder/Karen authorization and the realtime tool endpoint. Delegate only a short
public-topic query to the Responses web_search tool; do not automatically attach
site data, conversation history or documents. Reuse the server OpenAI key.

Require actual completed search and inline provider citations. Preserve the
retrieved excerpt separately from the spoken paraphrase in assistant_messages,
with clickable source links and retrieval time. Domain-separated HMAC attestation
binds results to the authenticated session; the browser cannot invent stored
source payloads. This proves retrieval, not truth or clinical verification.
The result is untrusted conversation context, never canonical clinical evidence.

Use RU/EN disclosure and data-policy version 3, OFF-default search flag, existing
pilot restrictions, atomic search-attempt budgets, minimal audit, bounded output
and cancellation. No search tool for client voice. Common identifier rejection
is not complete PHI detection; mixed-data privacy validation remains a release
gate. Existing provider and database production boundaries remain unchanged.

Local implementation is complete; production release is NOT CLOSED. Full report,
validation evidence, limitations and exact next action: docs/ankh/voice_web_search.md.


## D-060 — Anham avatar launches the full-screen voice conversation (2026-09-09)

The owner requested a small Anham image beside microphone and attachment controls,
opening a large talking Anham above the page. Reuse official artwork and existing
RealtimeVoice lifecycle; use a native modal dialog in a body portal so nested
chat panels cannot clip it. Retain scoped transcript/source persistence in the
original chat. Close/End/Escape must stop media and return focus; opening must not
start a second session. Browser dictation and live voice remain mutually exclusive.

RU/EN labels, reduced motion, mobile safe areas and explicit save-error recovery
are required. The existing disclosure moves beneath the composer; server access,
provider flags, data-policy version and production PHI boundaries do not change.
Local UI implementation and synthetic verification are complete. Production
acceptance remains pending. Report: docs/ankh/voice_avatar_interface.md.


## D-061 — Five voice choices and consent-linked personal voices (2026-09-09)

Offer five reviewed Realtime choices: Marin, Cedar, Coral, Sage, Verse. Resolve
voice on the authenticated server from reviewed aliases. Keep persona and access
independent of vocal timbre. Use an account/persona-derived browser preference
key and a fixed-phrase, bounded TTS preview that sends no user/Case content.
Changing voice ends and saves the old session; a new session uses the new voice,
with previous text retained in chat rather than silently claiming live continuity.

Founder/Karen personal voices require provider eligibility and each owner's
separate consent and sample recordings. Enable staff-only aliases only after
matching provider voice/consent references are configured. Raw provider IDs from
clients are never accepted. Creation is an operator workflow with local dry-run,
explicit execution/owner-confirmation gates, private atomic checkpoints, exclusive
per-owner locking and reconciliation of uncertain provider POSTs before retry.

No real personal voices were created in this task; recordings and provider access
are missing. No account terms were accepted, keys created, paid calls made or
production enablement performed. A protected Vercel preview was published from
the validated branch for synthetic/UI testing; personal voice activation
and production release remain open. Report and exact next action:
`docs/ankh/voice_choices_and_personal_voices.md`.

## D-056 — Proactive Anham chat uses fixed templates and atomic delivery

Decision (2026-09-09): registration welcomes and later non-medical check-ins are
stored once in the existing `assistant_messages` history. Each delivery retains
RU/EN template text; active-locale projection does not create another message.
An account-scoped service-only delivery cursor and PostgreSQL transaction own
eligibility, preference locking, a minimum 72-hour interval and idempotency.
Explicit outreach refusal is sticky and cannot be reset by registration or cron.

Why: independent select/insert HTTP calls can duplicate messages, race with
an opt-out or advance a cursor without saving the message. Fixed organizational
templates avoid unreviewed medical interpretation and external AI processing.

Constraint: `ASSISTANT_OUTREACH_ENABLED` is off by default. This local increment
does not authorize a production migration, deploy, real-user send or change to
Ankh clinical trust gates. The subsequently authorized staging acceptance verified
real concurrent requests and the RU/EN UI; production activation remains separate.
See `docs/ankh/assistant_outreach.md`.

### D-056 addendum — skip locked preferences and scope staging sends

Staging showed that waiting for an opt-out lock can exhaust the PostgREST
statement timeout. The worker now skips locked existing preference rows and
bounds concurrent initialization to 500 ms, deferring a busy profile to a later
run. It never assumes the old preference permits a send. The corrective
migration preserves delivery/cursor atomicity and unique numbering.

`ASSISTANT_OUTREACH_PROFILE_IDS` optionally restricts sends to explicit UUIDs;
invalid or empty configured scopes fail closed. This allowed real HTTP/browser
acceptance on a shared staging branch without sending to other tasks' profiles.

Release preparation: preserve current main's published tariffs. Apply both
outreach migrations before deploying the new history reader and keep delivery
disabled. Automatic approval review rejected the production migration under
the general "next step" authorization; explicit production schema authorization
was the pending gate. The owner subsequently explicitly confirmed both
production migrations and publication with sending disabled. Both migrations
are now applied; Vercel production flag is explicitly `false`. Preserve main's
all-language original history, pagination and private/client tier boundaries;
translate only saved outreach templates. Opt-out acknowledgements return the
existing durable-history saved/messages contract, including storage failure.

After the successful preview build, automatic approval review separately
rejected the merge-to-main action because the owner confirmation named
publication but not merging the default branch. No direct-deploy workaround
was used. Production schema and disabled flag are ready; merge and resulting
production rollout await explicit merge-to-main authorization.

## 2026-09-09 — Publish the two approved tariffs

Publish temporary full-review price 299 USD with Stripe fees included and the supplied review and 100-day support links, using existing production code as base. Preserve current production offer fingerprints; new review terms are oferta-v8. Other uncommitted local work is outside this release. Existing 500 USD review link is used only from 1 December 2026 onward when no new 500 link is configured.

## 2026-09-09 — Durable assistant history publication boundary

Conversation history is stored in existing assistant_messages, scoped to the authenticated author and private/client tier family; personal/private case dialogues remain separate. Locale is source metadata, not a visibility filter. Original text/timestamps are retained and browsing pagination is separate from bounded model context. Persisted conversation does not authorize knowledge publication or clinical trust promotion. Publish this fix independently of concurrent founder-knowledge/persona work. No schema or production processing-gate change.


## 2026-09-09 — Anna integrated memory and whole-archive retrieval

Owner authorized publication of the single-window founder assistant, direct save commands, and search across the complete knowledge archive. Existing assistant_knowledge remains canonical; internal notes use staff/general and authenticated created_by. Every founder question searches all active staff/both entries in pages of 200, ranks lexical matches, and adds up to 12 source-labeled notes within 24,000 characters. Latest 40 notes remain the default context. Archive failures are explicit in the answer instructions. No schema changes, PHI test data, clinical verification or client publication. Release isolated from production commit d9e001f. See docs/architecture/ANNA_DIALOGUE_MEMORY.md.

## 2026-09-09 — Preserve confirmed history and actual timestamps

Include created_at in both rows of every bulk exchange insert. Record question arrival and answer completion separately; use the same prepared rows for retries. Do not turn empty acknowledgements into saved:true or fabricate sequence IDs. Keep existing two-row insert/readback confirmation and visible storage-failure handling. This is a persistence correction, with no new schema or permission.

## D-062 — Built-in staff voices first (2026-09-09)

Owner deferred personal voices. Enforce ANHAM_VOICE_BUILTINS_ONLY and restrict initial rollout to verified founder/Karen accounts. Reuse current private history tiers/timestamps and shared safety instructions. Personal recordings are not required. Production migration approval and live acceptance remain explicit launch gates. See docs/ankh/builtin_voice_launch_2026_09_09.md.

## D-063 — Same text authority for staff voice (2026-09-09)

Voice delegates actual recognized user commands to the existing authenticated staff text handler. Model arguments cannot define a write. Actor/Case are session-bound; private history is server-loaded. One execution per signed session/turn prevents duplicate saves. Founder internal notes and Karen confirmation retain text behavior. Receipt policy v4. No new production schema authorization is inferred from the parity request. See docs/ankh/voice_text_permissions.md.

## D-057 — One prose style, normalization only at presentation boundaries

Decision (2026-09-09):
All Anham audiences use the same RU/EN rule for calm, natural writing in short
paragraphs without Markdown or decorative formatting. Source data, observed
patterns, hypotheses and Karen decisions remain explicitly distinguishable in
ordinary words. Style never expands a role's medical permissions.

Normalize complete human-readable output on the server before display/storage.
Parse machine envelopes first; normalize only designated narrative fields.
Never run this normalizer over source/OCR, extracted values, machine JSON,
human messages or approved decisions. Preserve ambiguous clinical symbols and
URLs rather than deleting characters indiscriminately. Historical AI output
may be projected for display without a data backfill.

Implementation and limits: `docs/ankh/anham_response_style.md`.
This local change does not authorize production deployment or close any
extraction, trust, clinical validation or PHI gate.

Acceptance addendum (2026-09-09): owner-authorized browser acceptance uses a
loopback synthetic provider and an environment allowlist, without production
credentials or auth bypasses. It proves the prompt/HTTP/normalizer/rendering
path, not live-model prose quality or authenticated persistence. Language
switching reads the current browser address at click time because shared
layout props can retain a previous route after client navigation. Public
locale twins preserve query and fragment; cabinet routes keep one address.

Review addendum (2026-09-09): presentation must retain ambiguous measurement
signs, leading decimal separators and unit-bearing numeric lines. Protected
scientific notation remains numeric when evaluating surrounding syntax.
Generated annotations use explicit surface/field locales; an empty normalized
advice response is an error. Provider labels preserve content-line boundaries.
Review evidence: `docs/ankh/anham_response_style_review.md`.

---

---

## D-058 — Factual honesty is provider-wide; text is not an action receipt

Date: 2026-09-09.

One canonical assistant policy is applied last at both text-provider boundaries
and in Realtime. Facts require available sources; model drafts/consensus and
user claims do not establish operational actions, medical conclusions or trust.
Query errors remain unknown, limited samples retain scope, and service access
does not stand in for payment evidence. Retired Case processing classifications
are excluded from the assistant snapshots touched by this change.

Client/staff final text is screened for recognizable unsupported action claims,
URLs and percentages before delivery/history persistence. Without an executed
handoff, escalation is a proposed human next step, never «Уточню» or a fabricated
notification. Emergency direction takes precedence over waiting for the team.

This bounded screen is not semantic verification. Voice and structured/OCR outputs
receive the rule but not conversational replacement. Details and limitations:
`docs/ankh/factual_honesty.md`. No production deployment or PHI authorization is
implied; existing clinical trust gates remain unchanged.

---

## D-059 — Source metadata and action receipts replace prompt-string coincidence

Date: 2026-09-09. Supersedes the screening portion of D-058.

Compose assistant context as request-only source projections over existing data:
system records, user reports, AI drafts, human-approved wording and center knowledge
remain distinct, with explicit availability, timestamps, review metadata and scope.
Retrieval time is not observation time, a Case summary is not a clinical fact, and
approval of one text field never approves a different AI summary. This creates no
new persistent Case/evidence/trust store and grants no new data access.

Do not treat the presence of a URL or percentage anywhere in a prompt as semantic
grounding, or reject a correctly derived value merely because it is not verbatim.
Remove that screen; preserve the factual-honesty instruction and measure behavior.
Action confirmation must be rendered from successful server receipts bound to the
same request, actor and Case, never from request-body claims. The current read-only
chat has no action receipts. A narrower prose check remains a limited backstop.
Ambiguous questions should first receive a clarification rather than automatic
team escalation; quoted actions, negation and transparent arithmetic remain useful.

Keep raw model answers and screened answers separate in evaluation reports. A
transport success is not a factual pass. Offline tests do not close live-model
behavior validation; record pending access/review and actual failures explicitly.
No production deployment or PHI processing is authorized by this decision.

---

## D-060 — Preserve attribution in replies and provenance in recovered history

Date: 2026-09-09. Follow-up to D-059.

Reported, confirmed, unverified and refuted information remain distinct throughout
the entire answer, including suggested customer/public text. Missing payment data
does not establish a pending transaction; missing assistant context does not prove
organizational absence. An explicit author's admission may be cited as such; lack
of verification alone does not establish fabrication. These are model instructions,
not a universal semantic-verification guarantee.

Recover history only from an available source. For the owner-authorized synthetic
browser baseline, append a labeled archive retaining original visible wording and
minute-level times, with actual recovery time and a separate audit event. Do not
invent second-level timestamps, native row identities or rewrite earlier messages.
Reuse the canonical history/audit tables; no new store, trust model or PHI gate.

The integrated candidate retains the previously published timestamp correction
and acknowledges storage only through confirmed records. See
`docs/ankh/history_recovery_and_honesty_v3.md` for acceptance and limitations.

## 2026-09-09 — Authorized production voice release

Owner explicitly approved both voice-history production migrations and site enablement. Applied only those two, retained RLS, enabled verified-staff built-ins and web search with custom voices off. PR #159 merged, production READY. Live microphone/transcript acceptance is still separate from deployment success; see docs/ankh/voice_production_release.md.

## 2026-09-09 — Assistant-only delegation

The owner confirmed an existing client account for founder-equivalent assistant capabilities. Use an explicit server-only assistant allowlist and /assistant entry point, not a profile role promotion or FOUNDER_EMAILS. Retain own-profile history, account-status checks and existing non-assistant authorization. See docs/ankh/assistant_delegate_access.md.

## 2026-09-09 — Voice conversation continuity

Isolated fix based on main 77258dc: retain recognized user turns after voice interruption, cancellation or failed output; correct instructions denying supplied history; label restored interrupted AI replies. Five new behavioral tests reproduced the loss before correction. No schema, PHI test data or clinical phase changes. Production acceptance remains open; see docs/ankh/voice_conversation_memory.md for validation and exact release step.

## 2026-09-09 — Server conversation recall

Client and private text generation now retrieve own stored conversation server-side: 60 recent rows plus up to 12 older lexical matches, constrained by authenticated profile, tier family and exact personal/Case scope, without locale filtering. Existing staff voice text-bridge calls inherit this context. Bounded, source-tagged excerpts remain unverified conversation; no schema or clinical gate changes. 1550/1550 tests across 168 files PASS; TypeScript, ESLint PASS. Isolated implementation CLOSED / GO for release; production recall acceptance NOT CLOSED. See docs/ankh/server_conversation_recall.md. Retains voice interruption correction 59e9306.

## 2026-09-09 — Lifetime text and voice conversation archive

Owner requires no age-based expiry for saved conversations with clients, Karen and Anna. Existing assistant_messages remains canonical. Native text and realtime tools now search/page/read full own messages of any age and language, including voice transcripts; authenticated owner/tier isolation and original Case labels remain. Do not add a rolling retention purge or replace originals with summaries. Request context/tool budgets do not limit archive age. Existing explicit deletion workflows remain. OpenAI archive calls use Responses store:false with unchanged model/reasoning; Claude uses native tools. Synthetic 2001-record live checks passed for both providers. No schema or clinical-gate change. See docs/ankh/lifetime_conversation_memory.md for limits, final checks and release status.
## 2026-09-09 — Elena is a CLIENT preview participant

Owner corrected the scope: own Case/client experience, not staff-equivalent authority. Revoke the delegate grant including stale configuration. Enable only the confirmed account through ANHAM_CLIENT_VOICE_TEST_EMAILS, preserving client tier, own-context checks and no staff tools. Prior delegation decisions are superseded. See docs/ankh/elena_client_voice_pilot.md.

## 2026-09-09 — Publish dangerous-assistance restrictions
Owner explicitly authorized publication. Scoped release from b18a898 expands shared RU/EN dangerous-assistance rules in text and existing voice without disabling voice or changing access/data. Full regression 1573/1573; added voice/safety checks 69/69; TS/lint/diff pass. See docs/security/DANGEROUS_ASSISTANCE_RELEASE_2026_09_09.md. Remote release verification pending; broader cost-dashboard/security branch remains separate.

## 2026-09-10 — Anham's introduction

Owner corrected the live voice wording: Anham is the AI assistant at Python
Method Center; Professor Python is the human founder/expert. The shared RU/EN
prompt now fixes the introduction in text and voice, with Russian pronunciation.
No permissions, schema, clinical changes or historical message rewrites.
Release evidence: docs/ankh/anham_center_introduction.md.

## 2026-09-10 — Warm voice delivery and diction
Shared RU/EN live/sample delivery instructions add natural warmth, context-sensitive
support, varied brief welcomes/goodbyes and complete word endings at speed 0.95.
Browser now forwards the pilot's own-case/web tools to existing server authorization.
No role/schema/clinical changes. 107 relevant tests pass; TS/ESLint/diff pass.
Acoustic validation remains a live listening task; see docs/ankh/anham_voice_delivery.md.