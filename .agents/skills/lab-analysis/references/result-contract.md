# Laboratory result handoff

Reuse the document-analysis v2 envelope and finding fields from its
`references/output-contract.md`. Resolve that dependency by name/path; never
fabricate a compatible package if it is missing. Do not recreate its schema in
this skill. The caller retains source acquisition and persistence ownership.

For each lab row require separate fields for analyte, result, unit, reference,
source_flag, specimen and method; unknowns are explicit nulls with reasons.
Preserve original words, result type, printed date/event kind, actual anchors,
both readings, processor/parser versions, checks, provenance and trust reasons.
Add anatomy/laterality when relevant and retain reference qualifiers. Link
every field to its supporting cell/span; never borrow another row's unit/range.

Add comparison records following comparison-contract.md, citing exact immutable
finding/source/snapshot references. Include excluded observations with reasons,
non-comparable pairs, missing context, conflicts and source-specific ranges.
An absent optional context field must not silently become NOT_APPLICABLE.

Return totals by actual trust state, including rejected/source-only evidence;
when the denominator is zero, leave the rate null and state that no observations
were available. This is not evidence of a healthy result or a successful reading.

Review items identify the affected fact/document/page and source. For truncation
preserve authoritative total, shown count and actual continuation or explicitly
partial delivery. Reuse the existing queue; never invent Case priority/classification.

On a source revision, regenerate eligible comparisons from the new snapshot.
Preserve prior comparisons/decisions as history; do not inherit a prior approval.
Keep processing, trust, persistence and Karen's decision separate. A result with
failed persistence is still unsaved even when all mathematical checks pass.

Read the document skill's dependencies.md for candidates in the current repo.
Resolve named row/numeric/Case skills rather than reporting them as executed.
