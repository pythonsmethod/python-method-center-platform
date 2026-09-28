#!/usr/bin/env python3
"""Offline comparison contract checks. No source lookup or trust promotion."""
import importlib.util
import json
import sys
from decimal import localcontext
from pathlib import Path

HELPER = Path(__file__).resolve().parents[2] / "document-analysis" / "scripts" / "validate_package.py"
spec = importlib.util.spec_from_file_location("document_contract", HELPER)
document = importlib.util.module_from_spec(spec)
spec.loader.exec_module(document)

DIMENSIONS = "analyte units specimen method anatomy_laterality date_kind temporal_order result_kind provenance version".split()
RESULTS = "NO_BASELINE NOT_COMPARABLE NOT_EVALUATED POTENTIAL_CHANGE CHANGE STABLE".split()


def validate(record):
    c = document.Checks()
    p = c.obj(record, "contract_version comparison_id case_id subject_id left right compatibility trust_eligible rule result reason_codes contradictions delta relative_delta", "root", True)
    c.check(p.get("contract_version") == "lab-analysis/2", "contract_version", "VERSION")
    for key in ("comparison_id", "case_id", "subject_id"):
        c.check(document.nonempty(p.get(key)), key, "IDENTITY_REQUIRED")
    result = p.get("result")
    c.check(result in RESULTS, "result", "RESULT_LABEL")
    reasons = c.strings(p.get("reason_codes"), "reason_codes")
    conflicts = c.strings(p.get("contradictions"), "contradictions")
    c.check(type(p.get("trust_eligible")) is bool, "trust_eligible", "ELIGIBILITY_BOOLEAN")
    sides = []
    excluded = False
    for name in ("left", "right"):
        value = p.get(name)
        if value is None:
            sides.append(None)
            continue
        side = c.obj(value, "finding_id source_version snapshot_id event_date_kind event_date result_kind exact_decimal unit trust_state decision_id decision_finding_id decision_snapshot_id decision_source_version decision_shadow_only excluded exclusion_reasons", name)
        for key in ("finding_id", "source_version"):
            c.check(document.nonempty(side.get(key)), name + "." + key, "REFERENCE_REQUIRED")
        c.check(side.get("trust_state") in ("VERIFIED", "NEEDS_REVIEW", "SOURCE_ONLY", "REJECTED"), name, "TRUST_STATE")
        c.check(side.get("result_kind") in ("EXACT", "CENSORED", "RANGE", "QUALITATIVE"), name, "RESULT_KIND")
        c.check(type(side.get("excluded")) is bool and type(side.get("decision_shadow_only")) is bool, name, "BOOLEAN_REQUIRED")
        exclusions = c.strings(side.get("exclusion_reasons"), name + ".exclusion_reasons")
        excluded |= side.get("excluded") is True or side.get("trust_state") == "REJECTED"
        if side.get("excluded") or side.get("trust_state") == "REJECTED":
            c.check(bool(exclusions), name, "EXCLUSION_REASON_REQUIRED")
        if side.get("event_date") is not None:
            c.check(document.valid_date(side["event_date"]), name, "DATE_INVALID")
        if side.get("result_kind") == "EXACT":
            c.check(document.decimal_value(side.get("exact_decimal")) is not None, name, "DECIMAL_REQUIRED")
        else:
            c.check(side.get("exact_decimal") is None, name, "NONEXACT_COERCION")
        sides.append(side)
    left, right = sides
    compatibility = c.obj(p.get("compatibility"), " ".join(DIMENSIONS), "compatibility", True)
    compatible = True
    resolved_dimensions = {}
    for name in DIMENSIONS:
        dim = c.obj(compatibility.get(name), "state reason rule_id", "compatibility." + name)
        resolved_dimensions[name] = dim
        state = dim.get("state")
        c.check(state in ("COMPATIBLE", "INCOMPATIBLE", "UNKNOWN", "NOT_APPLICABLE"), "compatibility." + name, "COMPATIBILITY_STATE")
        if state == "NOT_APPLICABLE":
            allowed = name in ("method", "specimen", "anatomy_laterality") and document.nonempty(dim.get("rule_id"))
            c.check(allowed, "compatibility." + name, "UNSUPPORTED_NOT_APPLICABLE")
            compatible &= bool(allowed)
        elif state != "COMPATIBLE":
            compatible = False
            c.check(document.nonempty(dim.get("reason")), "compatibility." + name, "COMPATIBILITY_REASON_REQUIRED")
    rule = p.get("rule")
    if rule is not None:
        rule = c.obj(rule, "id version supports_result_kinds", "rule")
        c.check(document.nonempty(rule.get("id")) and document.nonempty(rule.get("version")), "rule", "RULE_ID_REQUIRED")
        kinds = c.strings(rule.get("supports_result_kinds"), "rule.supports_result_kinds")
    else:
        kinds = []
    if excluded:
        c.check(result == "NOT_COMPARABLE", "result", "EXCLUDED_EVIDENCE")
    elif left is None or right is None:
        c.check(result == "NO_BASELINE", "result", "BASELINE_MISSING")
    elif not compatible:
        c.check(result == "NOT_COMPARABLE", "result", "COMPATIBILITY_REQUIRED")
    elif conflicts:
        c.check(result == "NOT_EVALUATED", "result", "CONTRADICTION_UNRESOLVED")
    if left is not None and right is not None:
        distinct = left.get("finding_id") != right.get("finding_id")
        c.check(distinct or result == "NOT_COMPARABLE", "result", "DUPLICATE_OBSERVATION")
        if result in ("CHANGE", "STABLE", "POTENTIAL_CHANGE"):
            c.check(compatible and not excluded and not conflicts and distinct, "result", "TREND_GATE")
            c.check(document.valid_date(left.get("event_date")) and document.valid_date(right.get("event_date")) and left["event_date"] < right["event_date"], "result", "TIME_ORDER_NOT_ESTABLISHED")
            c.check(document.nonempty(left.get("event_date_kind")) and left.get("event_date_kind") == right.get("event_date_kind"), "result", "DATE_KIND_MISMATCH")
            c.check(document.nonempty(left.get("unit")) and document.nonempty(right.get("unit")), "result", "UNIT_UNKNOWN")
            if left.get("unit") != right.get("unit"):
                c.check(document.nonempty(resolved_dimensions["units"].get("rule_id")), "result", "CONVERSION_RULE_REQUIRED")
            if any(s.get("result_kind") != "EXACT" for s in sides):
                c.check(rule is not None and all(s.get("result_kind") in kinds for s in sides), "result", "RESULT_KIND_RULE_REQUIRED")
        if result in ("CHANGE", "STABLE"):
            c.check(p.get("trust_eligible") is True and rule is not None and all(s.get("result_kind") in kinds for s in sides), "result", "RULE_AND_ELIGIBILITY_REQUIRED")
            for name, side in zip(("left", "right"), sides):
                c.check(side.get("trust_state") == "VERIFIED" and document.nonempty(side.get("decision_id")) and document.nonempty(side.get("snapshot_id")) and side.get("decision_finding_id") == side.get("finding_id") and side.get("decision_snapshot_id") == side.get("snapshot_id") and side.get("decision_source_version") == side.get("source_version") and side.get("decision_shadow_only") is False, name, "VERIFIED_BINDING_REQUIRED")
        if result == "POTENTIAL_CHANGE":
            c.check(p.get("trust_eligible") is False and any(s.get("trust_state") in ("NEEDS_REVIEW", "SOURCE_ONLY") for s in sides), "result", "REVIEW_ONLY_REQUIRED")
            if all(s.get("result_kind") == "EXACT" for s in sides) and left.get("unit") == right.get("unit"):
                a, b = document.decimal_value(left.get("exact_decimal")), document.decimal_value(right.get("exact_decimal"))
                c.check(a is not None and b is not None and a != b, "result", "NO_DIRECTIONAL_CHANGE")
    if result in ("NO_BASELINE", "NOT_COMPARABLE", "NOT_EVALUATED", "POTENTIAL_CHANGE"):
        c.check(bool(reasons), "reason_codes", "REASON_REQUIRED")
    c.check(p.get("relative_delta") is None, "relative_delta", "RELATIVE_DELTA_EXTENSION_REQUIRED")
    if p.get("delta") is not None:
        allowed = left is not None and right is not None and result in ("CHANGE", "STABLE", "POTENTIAL_CHANGE") and all(s.get("result_kind") == "EXACT" for s in sides) and left.get("unit") == right.get("unit")
        c.check(allowed, "delta", "DELTA_NOT_ALLOWED")
        value = document.decimal_value(p["delta"])
        a = document.decimal_value(left.get("exact_decimal")) if left else None
        b = document.decimal_value(right.get("exact_decimal")) if right else None
        if value is not None and a is not None and b is not None:
            with localcontext() as ctx:
                ctx.prec = 5000
                c.check(value == b - a, "delta", "DELTA_ARITHMETIC")
        else:
            c.check(False, "delta", "DECIMAL_REQUIRED")
    return c.errors


def main():
    try:
        with open(sys.argv[1], encoding="utf-8") as handle:
            errors = validate(json.load(handle))
    except (OSError, ValueError, IndexError, TypeError, OverflowError):
        errors = [{"path": "input", "code": "UNREADABLE_OR_INVALID_JSON"}]
    print(json.dumps({"scope": "STRUCTURE_AND_SELECTED_INVARIANTS_ONLY", "valid": not errors, "errors": errors}))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
