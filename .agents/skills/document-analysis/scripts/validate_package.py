#!/usr/bin/env python3
"""Offline checks only: no authentication, providers, PHI logs or persistence."""
import json
import re
import sys
from datetime import date
from decimal import Decimal, InvalidOperation


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def decimal_value(value):
    if not isinstance(value, str) or len(value) > 256:
        return None
    if not re.fullmatch(r"[+-]?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?", value):
        return None
    try:
        number = Decimal(value)
        return number if number.is_finite() and abs(number.adjusted()) <= 1000 else None
    except InvalidOperation:
        return None


def valid_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        return False
    try:
        date.fromisoformat(value)
        return True
    except ValueError:
        return False


def numeric_date_candidates(value):
    match = re.fullmatch(r"\s*([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})\s*", value or "") if isinstance(value, str) else None
    candidates = set()
    if match:
        a, b, year = map(int, match.groups())
        for month, day in ((a, b), (b, a)):
            try:
                candidates.add(date(year, month, day).isoformat())
            except ValueError:
                pass
    return candidates


class Checks:
    def __init__(self):
        self.errors = []

    def check(self, condition, path, code):
        if not condition:
            self.errors.append({"path": path, "code": code})

    def obj(self, value, keys, path, strict=False):
        self.check(isinstance(value, dict), path, "OBJECT_REQUIRED")
        value = value if isinstance(value, dict) else {}
        for key in keys.split():
            self.check(key in value, path + "." + key, "FIELD_REQUIRED")
        if strict:
            self.check(set(value) <= set(keys.split()), path, "UNKNOWN_FIELD")
        return value

    def arr(self, value, path):
        self.check(isinstance(value, list), path, "ARRAY_REQUIRED")
        return value if isinstance(value, list) else []

    def strings(self, value, path):
        items = self.arr(value, path)
        self.check(all(nonempty(x) for x in items), path, "STRINGS_REQUIRED")
        return items


def validate(package):
    c = Checks()
    p = c.obj(package, "contract_version execution_mode outcome", "root")
    c.check(p.get("contract_version") == "document-analysis/2", "contract_version", "VERSION")
    c.check(p.get("execution_mode") in ("LIVE", "SIMULATION"), "execution_mode", "MODE")
    if p.get("outcome") == "BLOCKED":
        p = c.obj(p, "contract_version execution_mode outcome errors", "root", True)
        errors = c.arr(p.get("errors"), "errors")
        c.check(bool(errors), "errors", "REASON_REQUIRED")
        for i, item in enumerate(errors):
            e = c.obj(item, "code retryable", f"errors[{i}]", True)
            c.check(nonempty(e.get("code")) and type(e.get("retryable")) is bool,
                    f"errors[{i}]", "ERROR_SHAPE")
        return c.errors
    c.check(p.get("outcome") == "RESULT", "outcome", "OUTCOME")
    p = c.obj(p, "contract_version execution_mode outcome context run reading findings persistence review_queue summary omissions", "root", True)
    ctx = c.obj(p.get("context"), "case_id subject_id document_id source_version source_digest digest_unavailable_reason", "context")
    for key in ("case_id", "subject_id", "document_id", "source_version"):
        c.check(nonempty(ctx.get(key)), "context." + key, "IDENTITY_REQUIRED")
        if p.get("execution_mode") == "SIMULATION":
            c.check(str(ctx.get(key, "")).startswith("synthetic:"), "context." + key, "SYNTHETIC_ID_REQUIRED")
    if ctx.get("source_digest") is None:
        c.check(nonempty(ctx.get("digest_unavailable_reason")), "context.source_digest", "REASON_REQUIRED")
    else:
        digest = c.obj(ctx["source_digest"], "algorithm value", "context.source_digest")
        c.check(nonempty(digest.get("algorithm")) and nonempty(digest.get("value")), "context.source_digest", "DIGEST_SHAPE")
    run = c.obj(p.get("run"), "run_id skill_version provider processor_version parser_version schema_version unavailable_reasons", "run")
    for key in ("run_id", "skill_version", "schema_version"):
        c.check(nonempty(run.get(key)), "run." + key, "IDENTITY_REQUIRED")
    unavailable = c.strings(run.get("unavailable_reasons"), "run.unavailable_reasons")
    for key in ("provider", "processor_version", "parser_version"):
        c.check(nonempty(run.get(key)) or (run.get(key) is None and bool(unavailable)), "run." + key, "VERSION_OR_REASON_REQUIRED")
    reading = c.obj(p.get("reading"), "status expected_pages pages coverage_issues languages document_type", "reading")
    c.check(reading.get("status") in ("COMPLETE", "PARTIAL", "FAILED"), "reading.status", "READING_STATE")
    count = reading.get("expected_pages")
    c.check(count is None or (type(count) is int and count > 0), "reading.expected_pages", "PAGE_COUNT")
    c.strings(reading.get("languages"), "reading.languages")
    c.check(reading.get("document_type") is None or nonempty(reading.get("document_type")), "reading.document_type", "DOCUMENT_TYPE")
    coverage = c.strings(reading.get("coverage_issues"), "reading.coverage_issues")
    pages = c.arr(reading.get("pages"), "reading.pages")
    nums, states = [], []
    for i, item in enumerate(pages):
        page = c.obj(item, "page state issue_codes", f"pages[{i}]")
        n, state = page.get("page"), page.get("state")
        c.check(type(n) is int and n > 0, f"pages[{i}].page", "PAGE_INDEX")
        c.check(state in ("READ", "MISSING", "UNREADABLE", "UNSUPPORTED", "FAILED", "NOT_READ"), f"pages[{i}].state", "PAGE_STATE")
        issues = c.strings(page.get("issue_codes"), f"pages[{i}].issue_codes")
        c.check(state == "READ" or bool(issues), f"pages[{i}]", "PAGE_REASON_REQUIRED")
        nums.append(n if type(n) is int else -1)
        states.append(state)
    c.check(len(nums) == len(set(nums)), "reading.pages", "DUPLICATE_PAGE")
    if type(count) is int and count > 0:
        c.check(len(nums) == count and sorted(nums) == list(range(1, len(nums) + 1)), "reading.pages", "PAGE_INVENTORY_INCOMPLETE")
    if reading.get("status") == "COMPLETE":
        c.check(type(count) is int and count > 0 and len(nums) == count and
                sorted(nums) == list(range(1, len(nums) + 1)) and all(x == "READ" for x in states) and not coverage,
                "reading", "INCOMPLETE_COVERAGE")
    findings = c.arr(p.get("findings"), "findings")
    ids, required_review = [], set()
    for i, item in enumerate(findings):
        path = f"findings[{i}]"
        f = c.obj(item, "finding_id source_version evidence_snapshot_id evidence_kind fields anchors trust review_required issue_codes reading_ids dates", path)
        fid = f.get("finding_id")
        c.check(nonempty(fid), path + ".finding_id", "FINDING_ID_REQUIRED")
        ids.append(fid if isinstance(fid, str) else "")
        c.check(f.get("source_version") == ctx.get("source_version"), path, "SOURCE_VERSION_MISMATCH")
        c.check(f.get("evidence_kind") in ("LAB", "CLINICAL"), path, "EVIDENCE_KIND")
        c.check(type(f.get("review_required")) is bool, path, "REVIEW_BOOLEAN")
        if f.get("review_required") and isinstance(fid, str):
            required_review.add(fid)
        c.strings(f.get("issue_codes"), path + ".issue_codes")
        c.check(bool(c.strings(f.get("reading_ids"), path + ".reading_ids")), path, "READING_REFERENCE_REQUIRED")
        anchors = c.arr(f.get("anchors"), path + ".anchors")
        anchor_ids = []
        for j, value in enumerate(anchors):
            ap = path + f".anchors[{j}]"
            a = c.obj(value, "anchor_id document_id source_version page region span quote provenance_level missing_reason token_provenance", ap)
            aid = a.get("anchor_id")
            c.check(nonempty(aid), ap, "ANCHOR_ID_REQUIRED")
            anchor_ids.append(aid if isinstance(aid, str) else "")
            c.check(a.get("document_id") == ctx.get("document_id") and a.get("source_version") == ctx.get("source_version"), ap, "ANCHOR_SOURCE_MISMATCH")
            n = a.get("page")
            c.check(n is None or (type(n) is int and n in nums), ap, "ANCHOR_PAGE")
            level = a.get("provenance_level")
            c.check(level in (None, "P0", "P1", "P2", "P3", "P4"), ap, "PROVENANCE_LEVEL")
            c.check((n is not None and level is not None) or nonempty(a.get("missing_reason")), ap, "PROVENANCE_REASON")
            if level in ("P1", "P2", "P3", "P4"):
                c.check(type(n) is int and n in nums, ap, "PAGE_REQUIRED")
            if level in ("P2", "P3", "P4"):
                c.check(isinstance(a.get("region"), dict) and bool(a["region"]), ap, "REGION_REQUIRED")
            if level in ("P3", "P4"):
                token = c.obj(a.get("token_provenance"), "token_ids text_layer_version relation_validation", ap + ".token_provenance")
                c.check(bool(c.strings(token.get("token_ids"), ap + ".token_ids")) and nonempty(token.get("text_layer_version")), ap, "TOKEN_PROVENANCE_REQUIRED")
                if level == "P4":
                    relation = c.obj(token.get("relation_validation"), "method independent_signal passed", ap + ".relation_validation")
                    c.check(nonempty(relation.get("method")) and relation.get("independent_signal") is True and relation.get("passed") is True, ap, "RELATION_VALIDATION_REQUIRED")
        c.check(len(anchor_ids) == len(set(anchor_ids)), path, "DUPLICATE_ANCHOR")
        fields = c.arr(f.get("fields"), path + ".fields")
        c.check(bool(fields), path, "FIELDS_REQUIRED")
        names = []
        for j, value in enumerate(fields):
            fp = path + f".fields[{j}]"
            field = c.obj(value, "name original parsed normalized null_reason anchor_ids", fp)
            name = field.get("name")
            names.append(name if isinstance(name, str) else "")
            c.check(nonempty(name), fp, "FIELD_NAME")
            refs = c.strings(field.get("anchor_ids"), fp + ".anchor_ids")
            c.check(all(x in anchor_ids for x in refs), fp, "UNKNOWN_ANCHOR")
            if field.get("original") is None:
                c.check(nonempty(field.get("null_reason")) and field.get("parsed") is None and field.get("normalized") is None, fp, "MISSING_VALUE_INVENTED")
            else:
                c.check(isinstance(field["original"], str) and bool(refs), fp, "LITERAL_SOURCE_REQUIRED")
            if field.get("normalized") is not None:
                norm = c.obj(field["normalized"], "value rule_id rule_version", fp + ".normalized")
                c.check(nonempty(norm.get("rule_id")) and nonempty(norm.get("rule_version")), fp, "NORMALIZATION_RULE_REQUIRED")
            if name == "result" and field.get("parsed") is not None:
                parsed = c.obj(field["parsed"], "kind", fp + ".parsed")
                kind = parsed.get("kind")
                if kind == "EXACT":
                    c.check(set(parsed) == {"kind", "decimal"} and decimal_value(parsed.get("decimal")) is not None, fp, "EXACT_RESULT")
                    c.check(not re.match(r"\s*(?:[<>≤≥]|not\s+detected|negative|не\s+обнаружено|отриц)", str(field.get("original")), re.I), fp, "NONEXACT_COERCION")
                    c.check(not re.fullmatch(r"\s*[+-]?[0-9]+(?:[.,][0-9]+)?\s*[–—-]\s*[+-]?[0-9]+(?:[.,][0-9]+)?\s*", str(field.get("original"))), fp, "NONEXACT_COERCION")
                elif kind == "CENSORED":
                    c.check(set(parsed) == {"kind", "comparator", "bound"} and parsed.get("comparator") in ("<", "<=", ">", ">=") and decimal_value(parsed.get("bound")) is not None, fp, "CENSORED_RESULT")
                    sign = re.match(r"\s*(<=|>=|<|>|≤|≥)", str(field.get("original")))
                    if sign:
                        c.check(parsed.get("comparator") == {"≤":"<=", "≥":">="}.get(sign[1], sign[1]), fp, "COMPARATOR_CHANGED")
                elif kind == "RANGE":
                    low, high = decimal_value(parsed.get("low")), decimal_value(parsed.get("high"))
                    c.check(set(parsed) == {"kind", "low", "high"} and low is not None and high is not None and low <= high, fp, "RANGE_RESULT")
                elif kind == "QUALITATIVE":
                    c.check(set(parsed) == {"kind", "text"} and nonempty(parsed.get("text")), fp, "QUALITATIVE_RESULT")
                else:
                    c.check(False, fp, "RESULT_KIND")
        c.check(len(names) == len(set(names)), path, "DUPLICATE_FIELD")
        if f.get("evidence_kind") == "LAB":
            c.check(set("analyte result unit reference source_flag specimen method".split()) <= set(names), path, "LAB_FIELDS_REQUIRED")
        for j, value in enumerate(c.arr(f.get("dates"), path + ".dates")):
            dp = path + f".dates[{j}]"
            d = c.obj(value, "kind original normalized precision ambiguous null_reason anchor_ids", dp)
            c.check(nonempty(d.get("kind")) and type(d.get("ambiguous")) is bool, dp, "DATE_SHAPE")
            c.check(d.get("precision") in ("DAY", "MONTH", "YEAR", "UNKNOWN"), dp, "DATE_PRECISION")
            refs = c.strings(d.get("anchor_ids"), dp + ".anchor_ids")
            c.check(all(x in anchor_ids for x in refs), dp, "UNKNOWN_ANCHOR")
            if d.get("normalized") is not None:
                c.check(valid_date(d["normalized"]) and d.get("ambiguous") is False and d.get("precision") == "DAY" and nonempty(d.get("original")) and bool(refs), dp, "DATE_NOT_ESTABLISHED")
                candidates = numeric_date_candidates(d.get("original"))
                c.check(len(candidates) <= 1, dp, "AMBIGUOUS_PRINTED_DATE")
                if len(candidates) == 1:
                    c.check(d["normalized"] in candidates, dp, "PRINTED_DATE_MISMATCH")
            else:
                c.check(nonempty(d.get("null_reason")), dp, "DATE_REASON_REQUIRED")
        trust = c.obj(f.get("trust"), "state decision_id policy_version bound_finding_id bound_snapshot_id bound_source_version shadow_only reason_codes", path + ".trust")
        state = trust.get("state")
        c.check(state in ("VERIFIED", "NEEDS_REVIEW", "SOURCE_ONLY", "REJECTED"), path, "TRUST_STATE")
        c.check(type(trust.get("shadow_only")) is bool, path, "TRUST_SHADOW_BOOLEAN")
        reasons = c.strings(trust.get("reason_codes"), path + ".trust.reason_codes")
        if state == "VERIFIED":
            c.check(nonempty(trust.get("decision_id")) and nonempty(trust.get("policy_version")) and trust.get("shadow_only") is False and trust.get("bound_source_version") == ctx.get("source_version") and trust.get("bound_finding_id") == fid and nonempty(f.get("evidence_snapshot_id")) and trust.get("bound_snapshot_id") == f.get("evidence_snapshot_id"), path, "VERIFIED_BINDING_REQUIRED")
        if state == "NEEDS_REVIEW":
            c.check(f.get("review_required") is True and bool(reasons), path, "REVIEW_REASON_REQUIRED")
    c.check(len(ids) == len(set(ids)), "findings", "DUPLICATE_FINDING")
    if reading.get("status") == "FAILED":
        c.check(not findings and "READ" not in states, "reading", "FAILED_READING_HAS_RESULTS")
    saved = c.obj(p.get("persistence"), "status snapshot_id receipt_id idempotency_key readback_confirmed source_version error_code", "persistence")
    c.check(saved.get("status") in ("NOT_ATTEMPTED", "SAVED", "FAILED"), "persistence", "PERSISTENCE_STATE")
    c.check(type(saved.get("readback_confirmed")) is bool, "persistence", "READBACK_BOOLEAN")
    if saved.get("status") == "SAVED":
        c.check(p.get("execution_mode") == "LIVE" and saved.get("readback_confirmed") is True and all(nonempty(saved.get(k)) for k in ("snapshot_id", "receipt_id", "idempotency_key")) and saved.get("source_version") == ctx.get("source_version") and saved.get("error_code") is None, "persistence", "SAVE_NOT_CONFIRMED")
    else:
        c.check(saved.get("readback_confirmed") is False and saved.get("receipt_id") is None and saved.get("snapshot_id") is None, "persistence", "UNSAVED_RECEIPT")
        if saved.get("status") == "FAILED":
            c.check(nonempty(saved.get("error_code")), "persistence", "SAVE_REASON_REQUIRED")
    queue = c.obj(p.get("review_queue"), "items total shown next_cursor delivery_complete", "review_queue")
    items = c.arr(queue.get("items"), "review_queue.items")
    total, shown = queue.get("total"), queue.get("shown")
    c.check(type(total) is int and total >= 0 and type(shown) is int and shown == len(items) and total >= shown, "review_queue", "QUEUE_COUNTS")
    qids, visible = [], set()
    for i, value in enumerate(items):
        q = c.obj(value, "item_id kind reason_codes", f"review_queue.items[{i}]")
        qid = q.get("item_id")
        c.check(nonempty(qid) and q.get("kind") in ("FACT", "DOCUMENT", "PAGE") and bool(c.strings(q.get("reason_codes"), f"review_queue.items[{i}].reason_codes")), "review_queue", "QUEUE_ITEM")
        qids.append(qid if isinstance(qid, str) else "")
        if q.get("kind") == "FACT" and isinstance(qid, str):
            c.check(qid in ids, "review_queue", "UNKNOWN_FINDING")
            visible.add(qid)
    c.check(len(qids) == len(set(qids)), "review_queue", "DUPLICATE_QUEUE_ITEM")
    c.check(type(queue.get("delivery_complete")) is bool, "review_queue", "QUEUE_DELIVERY_BOOLEAN")
    truncated = type(total) is int and total > len(items)
    if queue.get("delivery_complete") is True:
        c.check(not truncated or nonempty(queue.get("next_cursor")), "review_queue", "QUEUE_TRUNCATED_WITHOUT_CONTINUATION")
    if not truncated:
        c.check(required_review <= visible, "review_queue", "REVIEW_ITEM_LOST")
        if coverage or any(x != "READ" for x in states):
            c.check(any(isinstance(x, dict) and x.get("kind") in ("DOCUMENT", "PAGE") for x in items), "review_queue", "COVERAGE_REVIEW_LOST")
    else:
        c.check(total >= len(required_review), "review_queue", "REVIEW_TOTAL_LOST")
    for i, value in enumerate(c.arr(p.get("summary"), "summary")):
        s = c.obj(value, "text finding_ids", f"summary[{i}]")
        refs = c.strings(s.get("finding_ids"), f"summary[{i}].finding_ids")
        c.check(nonempty(s.get("text")) and bool(refs) and all(x in ids for x in refs), "summary", "SUMMARY_SOURCE_REQUIRED")
    c.strings(p.get("omissions"), "omissions")
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
