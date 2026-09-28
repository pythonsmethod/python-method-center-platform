# Document result contract v2

This is an internal projection over existing types/stores, not a database schema
or implemented API. Fields below are required unless explicitly nullable. A
candidate package has no authority merely because it conforms to this contract.

## Envelope and failure

Use `contract_version: "document-analysis/2"`,
`execution_mode: "LIVE" | "SIMULATION"`, and `outcome: "RESULT" | "BLOCKED"`.
For BLOCKED return only these fields plus `errors: [{code, retryable}]`; return
no clinical payload or other person's identifiers. Use explicit codes such as
AUTHORIZATION_UNAVAILABLE, SOURCE_UNAVAILABLE, SOURCE_VERSION_CHANGED,
DEPENDENCY_UNAVAILABLE, UNSUPPORTED_FORMAT, PROVIDER_FAILED or
PERSISTENCE_CONTRACT_UNSUPPORTED. Error codes reveal no raw patient text.

For RESULT require:

| Field | Required content |
|---|---|
| context | case_id, subject_id, document_id, source_version from authorized records; source_digest as `{algorithm, value}` or null with `digest_unavailable_reason` |
| run | run_id, skill_version, provider, processor_version, parser_version, schema_version; null provider/version only when unavailable with `unavailable_reasons` |
| reading | status COMPLETE/PARTIAL/FAILED; expected_pages integer or null; pages; coverage_issues; languages; document_type |
| findings | Every fact with its durable or clearly temporary finding_id and fields described below |
| persistence | status NOT_ATTEMPTED/SAVED/FAILED, snapshot_id, receipt_id, idempotency_key, readback_confirmed, source_version and error_code |
| review_queue | items with item_id, kind FACT/DOCUMENT/PAGE and reason codes; total, shown, next_cursor, delivery_complete |
| summary | Statements `{text, finding_ids}` using existing findings; no diagnosis/client draft |
| omissions | Explicit unread/unavailable content and requested unsupported fields |

SIMULATION IDs use `synthetic:`. Do not report SAVED, readback_confirmed or a live
provider execution in simulation. An offline example is not a staging receipt.

## Reading coverage

Pages contain `{page, state, issue_codes}`. Page is 1-based; states are READ,
MISSING, UNREADABLE, UNSUPPORTED, FAILED, NOT_READ. COMPLETE requires a known
nonzero expected count, every expected page READ and no unresolved coverage issue.
A READ page means acquisition succeeded, not that every field is verified.
Unread cells/regions must still appear in findings/coverage_issues and make the
document result PARTIAL when relevant content could not be read.

FAILED means no usable reading; partial content cannot be described as complete.
Duplicate physical pages remain in inventory with a relation; do not silently
remove them or count them as independent measurements.

## Finding fields

Require `finding_id`, `source_version`, `evidence_snapshot_id` (null while unsaved),
`evidence_kind` (LAB/CLINICAL), `fields`,
`anchors`, `trust`, `review_required`, `issue_codes`, `reading_ids` and `dates`.
IDs bind exact records; they are not a fresh label generated each time a summary
is asked. Unpersisted IDs must be explicitly temporary and replaced/mapped by
the adapter on save. A changed extraction keeps a new version/snapshot relation.

Each field has `{name, original, parsed, normalized, null_reason, anchor_ids}`.
All are present; original/parsed/normalized may be null. Missing and unreadable
are distinct null_reason codes. An original null requires parsed/normalized null.
Normalization is `{value, rule_id, rule_version}`; do not replace original text.
Use source fields for name, result, unit, reference, source flag, method, specimen,
anatomy and laterality as appropriate. Preserve both independent readings with
their identity, provider/parser versions and conflicts in the existing evidence
store; `reading_ids` reference them, never collapse disagreement into one value.

For result.parsed use one of:

- EXACT: `{kind, decimal}` with an exact decimal string, including exponent.
- CENSORED: `{kind, comparator, bound}`; comparators `<`, `<=`, `>`, `>=`.
- RANGE: `{kind, low, high}`; no midpoint or implied exact value.
- QUALITATIVE: `{kind, text}`; negative/undetected is never numeric zero.
- null: unresolved parse; retain original and an issue code.

Reference intervals remain source-specific, with qualifiers, sex/age/method
conditions and inclusive/exclusive endpoints retained when printed. Missing
qualifiers are unknown. Do not substitute population ranges or infer units from
a range without an explicitly authorized additive derivation and review.

Anchors contain anchor_id, document_id, source_version, page (nullable), region
(nullable), span (nullable), quote (nullable), provenance_level, missing_reason
and token_provenance (nullable).
Reuse existing P0–P4 policy meanings; preserve `null` level with a reason if the
adapter cannot supply one. Coordinates need coordinate system, dimensions,
rotation/transform and units. Spans need retained text-layer version and token
IDs/offset convention. P3/P4 token_provenance contains token_ids and
text_layer_version; P4 also retains relation_validation with method,
independent_signal=true and passed=true. P3 may have a null document text span
when exact retained tokens still exist. A quote alone does not prove an exact span. Each anchor
belongs to the same source version; field.anchor_ids must resolve locally.

Dates contain `{kind, original, normalized, precision, ambiguous, null_reason,
anchor_ids}`. normalized is a full ISO date or null. Partial dates remain literal
with precision YEAR/MONTH/UNKNOWN and null normalized; do not invent a day.
An ambiguous date requires null normalized and a reason. Date kind is never
silently changed. Preserve timezone when the source actually supplies a time.

Trust contains `{state, decision_id, policy_version, bound_finding_id,
bound_snapshot_id, bound_source_version,
shadow_only, reason_codes}`. VERIFIED requires a non-shadow, current authorized
decision bound to this exact fact, non-null evidence snapshot and source version.
This is checked by the server, never by the
model. The validator only checks structural consistency of that assertion.
NEEDS_REVIEW requires review_required=true and visible reasons. A current
decision is not authority for a corrected or re-extracted fact.

## Persistence and review

SAVED requires a real receipt, snapshot, idempotency key, matching source version
and successful authorized readback. Any mismatch is an integration failure. A
structurally valid JSON cannot establish any of these facts itself.
NOT_ATTEMPTED/FAILED must not contain a fabricated save receipt or successful
readback. Retain extraction success separately from save failure.

Every review_required finding must have a FACT review item, or remain in the
server's full queue with a real continuation. Retain document/page review items
even when there are zero extracted facts. total is the authoritative queue size;
shown equals items.length. If truncated without a real cursor, set
delivery_complete=false and explain incomplete delivery. Never invent a cursor.
All queues are internal evidence-review queues; do not classify/prioritize Cases.

## Existing implementation mapping

Map `finding_id` to `CanonicalLabFact.factId` / the Clinical Evidence ID;
`source_version` to the adapter's source revision/fingerprint with its definition;
run IDs to existing extraction/analysis runs; anchors to retained clinical token
provenance; trust to the existing TrustDecision, and review to existing snapshots.
Canonical verificationStatus alone cannot express SOURCE_ONLY; use the existing
trust layer rather than changing that enum or treating SOURCE_ONLY as VERIFIED.
Check field and history support before save. Do not claim the legacy upsert path
provides immutable snapshots, raw dates or this contract without verifying it.
