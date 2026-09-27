# ANHAM: Karen's philosophy of communication

Work ID: NX-04-ANHAM-PHILOSOPHY-20260927. Owner: PMC / ANHAM.
Owner instruction, 2026-09-27: implement the reviewed material in Anham and
preserve the complete material wherever the system needs to draw on it.

## Scope and authority

This is the PMC communication profile, not a new assistant, NEXORA-wide
methodology, model training, clinical rule or authorization mechanism. The
owner approved the prepared communication material for implementation in this
conversation. This is not evidence of Karen reviewing any patient or of a
medical efficacy claim being validated.

The existing shared prose policy now includes calm strength, peace, fairness,
care for life, honesty, growth and practical help. Respect distress, boundaries,
rest and disability. Use at most one context-appropriate thought, allow plain
language on request and keep urgent directions direct. Never impersonate Karen,
fabricate an attribution or promise recovery from faith or positive thoughts.

## Canonical locations

| Material | Existing destination and use |
|---|---|
| Complete source, including original speech and editorial caveats | Private Library document `ANHAM_Karen_Philosophy_RU_2026-09-26.md`, identity `libfile_7928b46fe27881919c13911d8ed81f2e` |
| Complete source for staff recall | Existing `assistant_knowledge`, five active `staff` / `general` rows in the production and active clinical-staging databases; no new table |
| Client-safe dynamic catalog | Two active `both` / `general` rows in the same existing table and environments; reference material available to the currently deployed text retrieval |
| Reviewed runtime projection | `lib/assistant/karen-philosophy.json`: 24 original RU/EN phrases, three selected exact RU Karen quotations with labeled EN working translations, six source-linked philosophical foundations |
| Executable communication policy | `lib/assistant/karen-philosophy.ts`, version 1.0.0; shared prose policy and voice persona consume it |
| Project continuation | This record, CURRENT_STATE, DECISIONS, ROADMAP and the existing ANHAM application architecture profile |

The full private transcript is not committed to the public repository. The
public runtime projection contains no patient data and no unsupported efficacy
claims. Exact RU quotes, new editorial phrases, working translations and
paraphrases remain distinct. Faith-specific material is opt-in. Frankl is
identified as a twentieth-century source, not an ancient tradition.

The prepared compiled profile is a versioned application policy. Knowledge-row activation
does not change a deployed compiled profile: to withdraw a phrase, update its
catalog entry and release the code; retain the older source version privately.
This avoids treating the newest 40 dynamic knowledge notes as the permanent
persona and keeps the shared policy available during a knowledge-store outage.

## Complete-source persistence

Source v1.0: 29,126 characters, 51,750 UTF-8 bytes.
SHA-256: `73898411cea1610befbdd5c79ba730ce80aecda5aea7d84a3b19c9a7f90aa8dd`.
Each row contains JSON provenance, a part number and the exact `text` slice.
Concatenate the five `text` values by `part` to recover the complete source.
Maximum stored row content is 6,690 characters, below the existing 8,000 limit.

| Part | Existing knowledge row ID |
|---|---|
| 1 | `479056ad-9734-5004-b8fc-e8884a449223` |
| 2 | `be11aff4-3017-513c-8579-0a2a83f996cf` |
| 3 | `e99c487f-307a-5987-999e-48bb3b2605f1` |
| 4 | `7f2c1e5b-37b0-5917-9893-d338c077203d` |
| 5 | `9aefe008-8f47-55ed-bc67-3b752887d602` |

Ingestion used stable source-version IDs and INSERT ON CONFLICT DO NOTHING.
Readback in both environments returned five active staff-only parts and the
exact source hash. No existing record was overwritten. `created_by` was left
unset for this automation rather than impersonating a signed-in staff author.
Source metadata records the supplied speech and owner instruction. The source
is an author view/editorial document, not approved clinical evidence.

Production RLS remains enabled with a deny policy for anon/authenticated.
A direct anon read was denied by the existing table privilege. No permissions,
schema, provider credentials, patient records or Case decisions were changed.
The client prompt still filters dynamic knowledge to client/both; these staff
source parts cannot enter client retrieval. Staff archive search can find the
full source using its title and existing paginated knowledge tools.

### Client-safe dynamic catalog

The owner-authorized reference catalog was separately projected into two
existing knowledge records. These contain values, original RU/EN phrases and
source-labeled quotations/foundations, with no full private speech. They retain
the distinction between editorial phrases, exact RU quotations and working
translations; faith is opt-in and no health outcome is promised.

| Record | ID | Content SHA-256 |
|---|---|---|
| 24 thematic phrases | `7b9541b7-e3f1-5956-a30b-180594bcfad0` | `2dd6a86238e5aedb0ad6a06e460271bbabb4fe283a3a7de1d58c1fa123a753f6` |
| Values and sources | `a30bbca7-8093-5320-975d-bb8f67787752` | `0efb641df02156aad553701ca20ddd3d72915282ec135cb8c0b6c9bc7aba444d` |

Both environments returned exact content hashes, audience `both` and active
status. Lengths are 6,179 and 5,738 characters, within the existing limit. The
catalog was first saved/read back in staging, then Production, with stable IDs
and no replacement of other knowledge. These records enter existing retrieval
as reference data. They neither override application instructions nor guarantee
permanent persona availability if the latest-40 knowledge window later fills.

## Channel map

| Channel | Existing binding |
|---|---|
| Guest, registered and paid client text | `prompts.ts` consumes the shared `ANHAM_RESPONSE_STYLE` |
| Anna and Karen private text | Same shared style; existing roles and tool permissions remain |
| Realtime client voice | `clientVoiceInstructions` reuses the corresponding text prompt |
| Realtime staff voice | `voiceInstructions` uses the shared `voicePersona` |
| GPT-Live voice, including direct social conversation | `openLiveSession` uses that same `voicePersona`; delegated work still calls existing text handlers |
| Human-readable review, sleep and supplement explanations | Existing shared style, with explicit restriction to clear respectful prose on analytical tasks |
| Source transcription and metadata extraction | Unchanged; philosophy is not applied to extraction or machine/source fields |

The vocal timbre, voice access lists, model choices, conversation history and
clinical review boundaries do not change. This does not create a clone of
Karen's voice. Already-open voice sessions need a normal reconnect to receive
new session instructions.

## Validation and release

Base: main `fba352419d71831ad5363601b5a2ae35cdd69359`, the deployed monthly
Checkout release. The focused change does not import any pending PR.
PR #214 has no overlapping runtime file; #222 overlaps canonical project
records only. Its document/clinical acceptance remains separate. PR #230's
billing release record remains pending and is not rewritten by this task.

Local focused suites: 99/99 passed. Full regression: 231 files passed, one
existing skipped; 2,130 tests passed, one existing skipped. TypeScript and
ESLint passed. The unchanged synthetic benchmark reported three documents,
four pages and zero critical extraction, false VERIFIED or security errors.
These tests verify prompt delivery, provenance categories, role/language
preservation and source-text boundaries, not clinical efficacy or every model
response. Local production build and security gate passed. Remote checks and production
runtime readback are recorded in the dated release checkpoint when completed.

Pre-release checkpoint: SOURCE SAVED / DYNAMIC CATALOG LIVE / COMPILED POLICY
LOCALLY TESTED / VOICE RELEASE AUTHORIZED. On 2026-09-27, two synthetic Production guest
requests (Russian and English) returned HTTP 200. The Russian response used
the catalog's fear/support wording; the English response used its translation
and a small-step thought. This is bounded evidence of dynamic catalog use,
not proof of a new deployment, all responses, clinical benefit or voice quality.
The RU response combined several related phrases: the prepared compiled rule
of at most one short thought is not yet deployed or behaviorally accepted.

Code commit `aa13be0a9eee2299caef359e814203e489eb29d9` was prepared locally.
Auto-review rejected its push because this GitHub repository is public and the
user had authorized integration but not explicitly publication of the new
implementation at that public destination. No bypass was attempted and remote
branch readback found no such branch. The direct Vercel deployment tool returned
`Tool deploy_to_vercel not found`; no private direct release was performed.
At that checkpoint Production remained the observed main deployment at
`fba352419d71831ad5363601b5a2ae35cdd69359`. Remote checks, merge/deployment and
fresh voice-session acceptance were pending. The owner subsequently explicitly
authorized public publication of the prepared code and requested Voice
integration and completion of the release. Refetch confirmed main is still the
same base, with no intervening changes to merge. The existing implementation
already covers Realtime staff, Realtime client through its text prompt, and
GPT-Live through the shared voice persona. Publication and release are now
authorized; the completed release evidence follows.

### Released text and Voice profile — 2026-09-27

PR #231 published commit `57037ba01cb585c8ff99008b26d56283b6aeb2ad`; its tree
`afde8dda87cbd04786e599ce77329b3ba147bcaa` exactly matched the locally checked
candidate. Four additional synthetic provider-handshake tests verify the full
catalog, persona, language and safety policy in RU/EN Realtime staff requests.
Together with the text/client-context/GPT-Live/bridge suites: 124 passed.
The first test attempt used a nonexistent staff role in the two Karen fixtures
and correctly returned 403; the fixtures were aligned with the existing admin
role, without changing authorization code. TypeScript, ESLint and diff checks
passed. GitHub run `36352231440` completed successfully, including the full
regression suite, security checks, dependency audit and build. Preview
`dpl_4bcj8qQXCpv9gdoE3vyK6DmB4eeA` was READY.

PR #231 merged at 2026-09-27 21:37:26 UTC as
`2a32d4d050269f95e5a5ff63045cbdd1546880a9`. Production deployment
`dpl_DoN5AzB6DDaAFP7tREgS6vwVR2Py` is READY, with both pythonmethodcenter.com
and www.pythonmethodcenter.com attached, on that exact merge commit. This
releases the compiled profile to text, Realtime staff/client and GPT-Live.
Existing access flags, voice choices, clinical gates and provider credentials
are unchanged. Already-open voice sessions must reconnect normally.

Post-release sample: two fresh synthetic public text requests returned 200.
RU used the catalog's fear/support thought and gave a next step; EN honored a
request for plain language without quotations. Two unauthenticated attempts,
one at each Voice session endpoint, returned 401 with a sign-in message. No
credential or catalog leak appeared in those errors. The public browser was
signed out; no authenticated Production audio round trip or listening-quality
acceptance is claimed. This bounded sample is not universal response or
clinical validation. Phase: IMPLEMENTATION / RELEASE COMPLETE; acoustic
acceptance remains an explicitly unmeasured observation, not a reason to widen
access or fabricate a spoken-session result. No schema or patient data changes
were required. The private status record and saved package are updated to this
release checkpoint while retaining the original source version and history.

## Recovery

Revert this scoped code change to remove the compiled profile. Retain private
source versions. If staff retrieval needs to be withdrawn, deactivate only the
five source IDs above, preserving the original content. To withdraw the dynamic
client catalog, deactivate only its two IDs. Do not delete history, roll
back unrelated main changes, loosen RLS or alter clinical gates.
