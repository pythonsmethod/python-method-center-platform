# Laboratory comparison contract v2

Use existing Canonical Facts/Evidence Packages and their current snapshots.
Return a projection, not a second fact store or automatic clinical decision.

Require `contract_version: "lab-analysis/2"`, `comparison_id`, `case_id`,
`subject_id`, `left`, `right`, `compatibility`, `trust_eligible`, `rule`,
`result`, `reason_codes`, `contradictions`, `delta` and `relative_delta`.

Each side is null for a missing observation or contains finding_id, source_version,
snapshot_id, event_date_kind, event_date, result_kind, exact_decimal, unit,
trust_state, decision_id, decision_finding_id, decision_snapshot_id,
decision_source_version, decision_shadow_only,
excluded and exclusion_reasons. Dates/units/snapshots may be unknown but cannot
support claims that require them. A side is a reference to the document evidence,
not a rewritten value. Resolve it from the authorized store and reject mismatches.

Compatibility has these mandatory dimensions: analyte, units, specimen, method,
anatomy_laterality, date_kind, temporal_order, result_kind, provenance, version.
Each dimension is `{state, reason, rule_id}`. State is COMPATIBLE, INCOMPATIBLE,
UNKNOWN or NOT_APPLICABLE. UNKNOWN/INCOMPATIBLE blocks comparison. NOT_APPLICABLE
needs an approved rule ID and may only be used for method, specimen or
anatomy_laterality when a domain rule actually permits it. It is not a way to
skip unknown analyte identity, units, time, provenance or version.

## Precedence

1. Excluded/rejected/duplicate/superseded/foreign-subject observations cannot
   support a trend. Return NOT_COMPARABLE and all reasons.
2. No eligible prior observation means NO_BASELINE. Never turn absence into STABLE.
3. Any unresolved material compatibility dimension means NOT_COMPARABLE.
4. Preserve contradictions separately regardless of result. An unresolved
   contradiction prevents CHANGE/STABLE. Use NOT_EVALUATED if otherwise comparable
   until source adjudication; do not assume conflict means a biological change.
5. Only after compatibility is established can review-only evidence yield
   POTENTIAL_CHANGE. REJECTED is excluded, not merely review-only.
6. CHANGE/STABLE require both current non-shadow VERIFIED decisions, matching
finding IDs, source versions, decision-bound snapshots and trust_eligible=true. They also require
   a resolved rule `{id, version, supports_result_kinds}` applicable to both sides.
   Missing rule means NOT_EVALUATED. Rule supports no diagnosis/clinical causality.

If comparable review-only exact values in the same unit are numerically equal,
use NOT_EVALUATED with REVIEW_PENDING instead of inventing POTENTIAL_CHANGE or
declaring STABLE. Potential change still requires a source-backed difference.

Use NO_BASELINE, NOT_COMPARABLE, NOT_EVALUATED, POTENTIAL_CHANGE, CHANGE or STABLE
as comparison results only. They are not client Case statuses or urgency classes.
Do not infer a fact's trust from the result label. CONTRADICTION remains an
independent finding, so it is visible alongside NOT_COMPARABLE or NO_BASELINE.

## Magnitude and precision

For ordinary exact numeric comparisons preserve exact decimal strings. The v2
local validator permits delta only when both referenced values already use the
same unit; it performs no unit conversion. A validated conversion must first
be represented additively in the authorized evidence with its rule and original
values retained. delta is right minus left in that common representation.
For compatible differing source units without that representation, leave delta
null. NEVER subtract a censored bound or range
midpoint as an observation. For CENSORED/RANGE/QUALITATIVE, retain delta and
relative_delta null unless an independently implemented, reviewed extension
expressly defines the supported semantics; this v2 validator allows no extension.

For this contract relative_delta, when present, is (right-left)/left; a UI percent
multiplies it by 100 and follows the rule's rounding policy. Baseline zero or a
rule disabling relative change requires null. Values must be finite. This
validator leaves relative_delta null; an implemented rounding-aware extension
must be separately versioned. Do not fake precision or use binary float rounding.

STABLE requires the actual configured deterministic rule; an unchanged string,
missing second result or lack of detected change is insufficient. Do not invent
universal thresholds, reference intervals, method compatibility or clinical
meaning. Preserve reference ranges from both laboratories and flag differences.

The local validator checks structural gates and exact-delta arithmetic when
supplied. It cannot verify authenticity of decisions, rules, source text, units
or context. Only the authorized adapter may bind those to real stored records.
