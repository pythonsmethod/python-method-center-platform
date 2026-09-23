# NEXORA document.read v1 — internal capability

Implemented in `lib/nexora/document-read.ts`; PMC adapter:
`lib/documents/nexora-reader.ts`. Product ownership follows
[NEXORA MASTER](../architecture/NEXORA_MASTER_ARCHITECTURE.md).

This is an internal server function, not an externally authenticated HTTP API,
standalone deployment or completed clinical document-analysis product.
It executes source reading; parsing, medical interpretation, human review and
client publication retain their existing, separate PMC boundaries.

## Contract

| Field | Meaning / authority |
|---|---|
| `version: "1"`, `operationId` | Capability contract version and operation identity |
| `scope` | Organization, application, actor and authorized subject; all four must match the trusted server grant |
| `source` | Source ID, version and one attachment; ID/version must match the grant before provider access |
| `policy` | Policy ID, content-derived prompt version, system/instruction and bounded token request; set by the server adapter |
| `grant` | Server-supplied scope/source/provider and byte allowance; never accepted from an untrusted browser as authority |
| `provider` | Injected `{id, model, read}` interface; generic core contains no PMC or provider SDK import |
| Result | `complete` text, explicit `refused`, or typed `failed`; incomplete/refused output is never a successful reading |
| Receipt | Contract/operation, scope, source/version/input-byte hash, policy version, provider/model, duration, outcome, logical call count, `NOT_VERIFIED` |

Allowed input is one PDF, JPEG, PNG, WebP, GIF, plain text, Markdown or CSV
attachment, canonical base64, limited by the grant to at most 25 MiB. These are
transport types, not an assertion of validated quality for every document.
Token request is 1–32768. Unsupported MIME, stale source, invalid encoding/size,
missing contract fields, different provider or scope fail before a provider call.

The PMC grant is made only after the worker has claimed an authorized queue item
and matched the active source row by document, Case and account. Organization is
`pmc`, application `pmc-document-worker`, actor `service:pmc-document-worker`, and
subject is the opaque account/Case composite. This does not issue external-tenant
credentials or grant an API customer access to PMC.

## Execution and persistence

The existing provider router owns provider selection. The document adapter makes
three separate sequential reads (header and two transcriptions) with the existing
reader, without chat archive scope/tools or cross-provider fallback. The generic
capability has no mutable shared cache or background memory.

Operation IDs derive from the claimed job ID, attempt, lock time, document and
source version, with a stage suffix. Queue claiming is compare-and-set; replay
after completion cannot claim that ready job. Failure retries are separate
attempts. This is not provider-side exactly-once charging or transactional
multi-table persistence.

The receipt's source version is the existing loaded-document fingerprint.
`contentSha256` hashes the actual bytes sent to the provider **after any existing
image downsizing**, not necessarily the original uploaded file. The policy version
hashes system text, instruction and token budget. No file name, raw document,
provider response or clinical conclusion is copied into the receipt; opaque
account/Case/source IDs remain private application metadata.

After both successful transcriptions, PMC keeps existing `document_extractions`
and stores the attempt's receipts under existing
`uploaded_documents.metadata.nexora_document_read`. It preserves other metadata
from the source snapshot. This is not an append-only billing/audit ledger, and
simultaneous unrelated metadata writers are not serialized by this change.
Failure receipts are returned in-process; early failed attempts are not yet a
durable full provider-attempt ledger. Existing queue failure state remains stored.

Extraction/receipt/replacement/completion write failures prevent a successful
`ready` response. Source-lookup failure touches only the claimed job. A mismatched
or archived source is rejected before storage/provider access. The represented
patient uses the current recipient identity; the account owner's health
questionnaire is not loaded for that patient.

`complete` means a complete provider answer, never verified medical correctness.
Every capability receipt remains `NOT_VERIFIED`; downstream trust policy and
Karen's source-bound decisions are unchanged.

## Integration, rollback and remaining work

Default server mode is `NEXORA_DOCUMENT_READ_MODE=nexora`. For an approved runtime
rollback, set `legacy` and redeploy the same candidate or revert the runtime
commit. This uses the prior attachment path while retaining the owner-scoped
queue fix. Legacy processing clears the current NEXORA receipt list so an older
receipt is not misattributed to a new run. No database migration is needed.

Contract, worker and HTTP authorization tests use synthetic inputs, a fake
provider and a local transport driven by actual supabase-js requests. Existing
review snapshot, response completion, honesty, history and access suites are
also required. They do not substitute for signed-in hosted acceptance or live
provider/real-document validation.

Not implemented here: public NEXORA API auth/revocation/quotas/pricing, external
tenant storage, full token cost accounting, Google Document AI production
activation, universal clinical quality, chat/voice migration, or automatic
clinical recommendations. NX-02's first internal boundary is complete in code;
NX-03/04/05 acceptance gates remain separate.
