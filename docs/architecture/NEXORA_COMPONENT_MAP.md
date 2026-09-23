# NEXORA / PMC component ownership — 2026-09-23

NX-01 inventory for the owner decision in [NEXORA MASTER](NEXORA_MASTER_ARCHITECTURE.md).
Baseline: main `c273d8e8ccd76ab4e096e92b39f9dbad3e943e6b` plus integrated PRs
#196, #189 and #213. This is a map of existing code, not a claim that every
capability is independently deployed. No archived repository was used.

## Components and callers

| Component / current location | Ownership | Callers and dependencies | Data / migration boundary |
|---|---|---|---|
| `lib/nexora/document-read.ts` | NEXORA generic capability, implemented here | PMC reader; injected provider interface | Versioned input/result/receipt; no PMC imports, storage, role or clinical rule |
| `lib/documents/nexora-reader.ts` | PMC adapter | Existing document worker → capability → existing provider router | Server-derived application/actor/subject/source grant; PMC prompts and policy hashes; receipts in existing document metadata |
| `lib/documents/processing.ts`, `/api/documents/process` | PMC workflow | Authenticated owner-scoped POST, authorized staff Case-scoped POST, secret-protected cron GET | Existing `document_processing_jobs`, `uploaded_documents`, `document_extractions`, `analysis_runs`, `lab_values`; no second Case or queue |
| `lib/documents/actions.ts`, `reprocessing.ts`, `identity-review.ts` | PMC workflow | Client/staff upload and reprocessing controls | Existing source upload/ownership, identity decisions, retry and archive rules |
| `lib/cases/case-documents.ts` | PMC source adapter | Document worker and authorized Case review | Existing protected storage, supported MIME types, image downsizing and source fingerprint; no change of storage owner |
| `lib/document-extraction/{types,google-document-ai}.ts` | Reusable extraction candidate | Document-AI validation and normalized harness | Raw-source/provenance adapter; **not wired into this production worker**; live PHI/processor approval remains separate |
| `lib/canonical-facts/`, `lib/clinical-evidence/` | Reusable evidence foundation plus medical domain types | Document-AI validation / connected harness | Preserve source, normalized and interpreted layers; medical schema must not become mandatory for external nonmedical applications |
| `lib/verification-trust/` | Reusable trust framework, PMC acceptance policy | Existing validation and shadow trust pipeline | Thresholds and supported domain validation stay versioned; no promotion of review-only evidence in this release |
| `lib/analysis/` | PMC domain | Current worker and stored analytical picture | Medical units, reference handling, trends and review requirements remain PMC rules; historical engine version unchanged |
| `lib/analytical-picture/`, `components/cases/CaseAnalyticalPicturePanel.tsx` | PMC expert workflow | Authorized Karen Case screen; existing review action | Existing `admin_notes`; source-version snapshot and correction are stored together; stale review does not apply to a changed extraction |
| `lib/cases/case-subject.ts`, Case context | PMC identity | Karen context and document worker | Account owner and represented patient stay distinct; represented patient's identity never imports the account owner's questionnaire |
| `lib/assistant/router.ts`, `claude.ts`, `openai.ts`, `openai-archive.ts`, `response-contract.ts` | Shared execution candidate, currently embedded in PMC | Client/staff/text/archive routes; document adapter uses isolated attachment path | API completion contract reused. Document path selects the existing Claude reader only. Chat deep/team paths still use multiple models; **chat migration is not complete** |
| `lib/assistant/{prompts,identity,knowledge,knowledge-search}.ts` | ANHAM / PMC domain | Text, staff and voice context builders | Persona, expert methodology, approved knowledge and roles stay application-scoped |
| `lib/assistant/{history,memory,conversation-context,conversation-archive,source-context}.ts` | Shared memory candidate plus PMC authorization adapter | Client/staff history routes; provider archive tools | Existing authorized history stores and boundaries; not a new cross-organization NEXORA memory API |
| `lib/assistant/{site-data-tools,client-action-tools,voice-site-tools,action-receipts}.ts` | PMC action adapter | Authenticated text/voice tools | Existing server authorization, confirmation and stored action receipts; no new tool authority from model output |
| `/api/assistant/realtime/*`, `/api/assistant/live`, `lib/assistant/{realtime-*,live-*,voice-*}` | Voice execution candidate plus ANHAM application | Existing pilot session/context/tool/transcript flows | Existing pilot allowlists, delivery and transcript stores; no voice/provider rollout in this increment |
| Assistant and Case UI, client cabinet, staff/admin routes | PMC / ANHAM interface | Existing server actions and authorized APIs | RU/EN and role visibility retained; no second product named ANKH |
| `lib/ankh-harness/`, `components/ankh/ConnectedHarnessPanel.tsx`, `/ankh-test` | NEXORA synthetic validation with PMC view | Explicit development-only flag; in-memory run | Visible name is NEXORA. Compatible paths/flag remain; external calls, persistence and production access are forbidden |
| `scripts/ankh/`, `output/ankh-benchmark/`, `docs/ankh/` | Historical evidence and compatibility paths | Existing tests, reports, operational references | Keep provenance and external identifiers. Do not rename old evidence as a new NEXORA validation |
| NEXORA owner hub in PR #212 | Separate owner interface | Its own branch and acceptance | Not brought into this release; hub UI is not the core or proof of an external API |

## Current document path

Authenticated input enters the existing PMC upload/queue. The worker validates
the source's Case and account before download. The PMC adapter issues the grant
and invokes NEXORA `document.read` v1. The router isolates this read from archive
tools, then calls the existing permitted provider. PMC retains parsing, identity,
duplicate/version detection, analysis and persistence. Karen reviews existing
evidence through the version-bound action; client publication remains a separate
authorized PMC action.

There are three sequential logical reads: header, first transcription, second
transcription. They use the same configured document provider. The two existing
transcriptions have not been removed or replaced by a Claude/GPT vote.
Provider SDK continuation may make additional physical requests; a logical-call
receipt is not a token bill or an exactly-once model-execution guarantee.

## Compatibility manifest

| Identifier | Action | Reason |
|---|---|---|
| Active standalone ANKH product name | Retired; active master and synthetic screen say NEXORA | Owner's product hierarchy |
| ANHAM name and PMC routes | Retained | Application and user experience remain PMC-specific |
| Existing document tables and source IDs | Retained | One evidence history and one Case |
| `/ankh-test`, `ANKH_HARNESS_ENABLED`, harness imports, benchmark command | Retained, still test-only | Avoid breaking dependent tests/scripts; technical aliases are not products |
| `ankh-analysis-1.0.0`, historic reports/migrations, cloud processor IDs | Retained | Algorithm/version lineage and externally bound identifiers |
| `NEXORA_DOCUMENT_READ_MODE` | New server-only switch: `nexora` default, `legacy` rollback | Reversible internal capability integration; no new client input or permission |

NX-01: CLOSED for the current repository's capability/application boundary.
The implementation and limitations of NX-02 are in
[Document Read v1](../nexora/DOCUMENT_READ_V1.md). Future extraction, chat, memory,
voice and external-API moves require their own contracts and acceptance.
