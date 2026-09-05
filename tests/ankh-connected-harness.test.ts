import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONNECTED_HARNESS_ENVIRONMENT, runConnectedAnkhHarness, type ConnectedHarnessCandidateOverride, type ConnectedHarnessDocument } from "@/lib/ankh-harness/connected-pipeline";
import { buildSyntheticConnectedDemo, normalizeSyntheticGoogleLike } from "@/lib/ankh-harness/synthetic-demo";

const identity = "synthetic-identity";
const document = (text: string, overrides: Partial<ConnectedHarnessDocument> = {}): ConnectedHarnessDocument => ({
  caseAlias: "synthetic-case", sourceDocumentId: "synthetic-document", currentVersion: "v1", candidateVersion: "v1",
  caseIdentityHash: identity, documentIdentityHash: identity, providerVersion: "google-like-normalized-v1", parserVersion: "connected-harness-v1",
  normalized: normalizeSyntheticGoogleLike(text), ...overrides,
});
const run = (documents: ConnectedHarnessDocument[], expectedContext: string[] = [], candidateOverrides: Record<string, ConnectedHarnessCandidateOverride> = {}) => runConnectedAnkhHarness({ environment: CONNECTED_HARNESS_ENVIRONMENT, externalCallsAllowed: false, persistenceAllowed: false, caseAlias: "synthetic-case", documents, expectedContext, candidateOverrides });
const failedIntegrity = (result: ReturnType<typeof run>, factId: string) => result.packages.find((pack) => pack.fact.factId === factId)!.checks.integrity.filter((check) => !check.passed).map((check) => check.name);

describe("connected Ankh in-memory harness", () => {
  it("runs normalized Google-like input through extraction, trust, Evidence Package and Case Picture", () => {
    const result = buildSyntheticConnectedDemo();
    expect(result.environment).toBe("IN_MEMORY_TEST");
    expect(result.externalCallsPerformed).toBe(0);
    expect(result.persistenceWritesPerformed).toBe(0);
    expect(result.packages.length).toBeGreaterThan(0);
    expect(result.picture.timeline).toHaveLength(result.packages.length);
    expect(result.picture.generatedFromPackageIds).toHaveLength(result.packages.length);
    expect(result.counters.verified).toBe(0);
    expect(result.picture.reviewQueue).toHaveLength(result.packages.length);
    expect(result.packages.every((pack) => pack.fact.caseId === "synthetic-connected-demo" && pack.immutableSource.sourceDocumentId.startsWith("synthetic-"))).toBe(true);
    expect(result.picture.missingContext).not.toContain("MEASUREMENT_UNIT_UNRESOLVED");
    const sourceKeys = result.packages.map((pack) => `${pack.immutableSource.sourceDocumentId}|${pack.immutableSource.page}|${String(pack.representations.extractedOriginal.text).toLowerCase().replace(/\s+/g, " ").trim()}`);
    expect(new Set(sourceKeys).size).toBe(sourceKeys.length);
  });

  it("fails closed on Case/document identity mismatch", () => {
    const result = run([document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4", { documentIdentityHash: "other-identity" })]);
    expect(result.packages.every((pack) => pack.contradictions.includes("CASE_DOCUMENT_IDENTITY_MISMATCH"))).toBe(true);
    expect(result.counters.verified).toBe(0);
  });

  it("keeps independent document-type signals ambiguous", () => {
    const input = document("FINAL DIAGNOSIS: Synthetic tissue.\nBI-RADS CATEGORY: 4");
    const coordinates = input.normalized.pages[0].blocks[0].boundingPoly;
    input.normalized.pages[0].blocks = [
      { id: "pathology-block", text: "FINAL DIAGNOSIS: Synthetic tissue.", textAnchor: null, confidence: 0.99, boundingPoly: coordinates },
      { id: "radiology-block", text: "BI-RADS CATEGORY: 4", textAnchor: null, confidence: 0.99, boundingPoly: coordinates },
    ];
    const result = run([input]);
    expect(result.documents[0].ambiguousType).toBe(true);
    expect(result.packages.every((pack) => pack.contradictions.includes("AMBIGUOUS_DOCUMENT_TYPE"))).toBe(true);
    expect(result.packages.every((pack) => pack.trustTransition.effective !== "VERIFIED")).toBe(true);
  });

  it("reports unresolved units and dates instead of inventing them", () => {
    const result = run([document("RADIOLOGY REPORT\nFINDINGS: Synthetic left observation 10 x 12 x 14 units.\nExam Date: unknown")]);
    expect(result.picture.missingContext).toEqual(expect.arrayContaining(["MEASUREMENT_UNIT_UNRESOLVED", "EVENT_DATE_UNRESOLVED"]));
    expect(result.packages.some((pack) => pack.fact.evidenceClass === "RADIOLOGY_MEASUREMENT")).toBe(false);
    expect(result.counters.verified).toBe(0);
  });

  it("surfaces incomplete sources without manufacturing facts", () => {
    const input = document("Synthetic unreadable source");
    input.normalized.pages[0].blocks = [];
    input.normalized.pages[0].tokens = [];
    const result = run([input], ["source_content"]);
    expect(result.packages).toHaveLength(0);
    expect(result.picture.missingContext).toContain("source_content");
  });

  it("surfaces conflicting source values and never promotes them", () => {
    const result = run([document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4\nBI-RADS CATEGORY: 5")]);
    expect(result.packages.some((pack) => pack.contradictions.includes("CONFLICTING_SOURCE_VALUES"))).toBe(true);
    expect(result.counters.verified).toBe(0);
  });

  it("compares mutated numeric and decimal candidates with a separate immutable source anchor", () => {
    const input = document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4\nFINDINGS: Synthetic focus measures 1.5 cm.");
    const baseline = run([input]);
    const category = baseline.packages.find((pack) => pack.fact.evidenceClass === "RADIOLOGY_CODED_CATEGORY")!;
    const measurement = baseline.packages.find((pack) => pack.fact.evidenceClass === "RADIOLOGY_MEASUREMENT")!;
    const changed = run([input], [], {
      [category.fact.factId]: { codedValue: "5" },
      [measurement.fact.factId]: { candidateValue: "15", numericValue: 15 },
    });
    expect(failedIntegrity(changed, category.fact.factId)).toContain("SOURCE_VALUE_MATCH");
    expect(failedIntegrity(changed, measurement.fact.factId)).toEqual(expect.arrayContaining(["SOURCE_VALUE_MATCH", "DECIMAL_SEMANTICS"]));
    expect(changed.counters.verified).toBe(0);
  });

  it("detects changed unit, date, row and reference instead of comparing a fact with itself", () => {
    const input = document("RADIOLOGY REPORT\nFINDINGS: Synthetic focus measures 1.5 cm.\nExam Date: 2026-08-25");
    const baseline = run([input]);
    const measurement = baseline.packages.find((pack) => pack.fact.evidenceClass === "RADIOLOGY_MEASUREMENT")!;
    const date = baseline.packages.find((pack) => pack.fact.evidenceClass === "DATE_EVENT")!;
    const changed = run([input], [], {
      [measurement.fact.factId]: { candidateUnit: "mm", candidateReference: "0-1", candidateRowKey: "wrong-row" },
      [date.fact.factId]: { eventDate: "2026-08-26" },
    });
    expect(failedIntegrity(changed, measurement.fact.factId)).toEqual(expect.arrayContaining(["UNIT_SEMANTICS", "REFERENCE_ASSOCIATION", "ROW_COLUMN_ASSOCIATION"]));
    expect(failedIntegrity(changed, date.fact.factId)).toContain("DATE_ASSOCIATION");
    expect(changed.counters.verified).toBe(0);
  });

  it("marks reference separation untested when no source reference signal exists", () => {
    const result = run([document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4")]);
    const check = result.packages[0].checks.deterministic.find((item) => item.name === "REFERENCE_VALUE_SEPARATION");
    expect(check).toMatchObject({ passed: false, status: "NOT_EVALUATED", detail: "NOT_EVALUATED:NO_SOURCE_REFERENCE" });
  });

  it("keeps parser and context confidence unknown without a measured signal", () => {
    const result = run([document("RADIOLOGY REPORT\nFINDINGS: Synthetic left focus measures 1.5 cm.")]);
    for (const pack of result.packages) {
      expect(pack.trustDecision.confidenceDimensions.fieldParse).toBeNull();
      expect(pack.trustDecision.confidenceDimensions.contextAssociation).toBeNull();
      expect(pack.trustTransition.effective).not.toBe("VERIFIED");
    }
  });

  it("fails integrity when the source anchor is absent or ambiguous", () => {
    const absent = document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4");
    absent.normalized.pages[0].tokens = [];
    const absentResult = run([absent]);
    expect(absentResult.packages.every((pack) => failedIntegrity(absentResult, pack.fact.factId).includes("SOURCE_VALUE_MATCH"))).toBe(true);
    expect(absentResult.packages.every((pack) => pack.missingContext.includes("IMMUTABLE_SOURCE_ANCHOR_MISSING"))).toBe(true);

    const ambiguous = document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4\nBI-RADS CATEGORY: 4");
    const ambiguousResult = run([ambiguous]);
    expect(ambiguousResult.packages.every((pack) => pack.missingContext.includes("IMMUTABLE_SOURCE_ANCHOR_AMBIGUOUS"))).toBe(true);
    expect(ambiguousResult.counters.verified).toBe(0);
  });

  it("blocks a requested trust promotion even when a caller supplies fake high confidence", () => {
    const input = document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4");
    const baseline = run([input]);
    const factId = baseline.packages[0].fact.factId;
    const result = run([input], [], { [factId]: { fieldParseConfidence: 1, contextAssociationConfidence: 1, requestedTrustState: "VERIFIED" } });
    const pack = result.packages.find((item) => item.fact.factId === factId)!;
    expect(pack.trustTransition.effective).not.toBe("VERIFIED");
    expect(pack.trustTransition.allowed).toBe(false);
    expect(pack.trustTransition.blockedReasons).toContain("NO_NEW_QUALIFYING_EVIDENCE");
  });

  it("rejects repeated processing of the same document version", () => {
    const first = document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4");
    expect(() => run([first, { ...first }])).toThrow("Duplicate document version");
  });

  it("rejects cross-Case mixing", () => {
    expect(() => run([document("RADIOLOGY REPORT\nBI-RADS CATEGORY: 4", { caseAlias: "another-case" })])).toThrow("different Cases");
  });

  it("rejects production/external/persistent execution flags", () => {
    const unsafe = { environment: "PRODUCTION", externalCallsAllowed: true, persistenceAllowed: true, caseAlias: "synthetic-case", documents: [], expectedContext: [] };
    expect(() => runConnectedAnkhHarness(unsafe as never)).toThrow("restricted to isolated in-memory execution");
    const source = readFileSync("lib/ankh-harness/connected-pipeline.ts", "utf8");
    expect(source).not.toContain("/api/documents/process");
    expect(source).not.toContain("processNextDocument");
    expect(source).not.toContain("createSupabase");
  });

  it("keeps the private screen local-only and meaning-equivalent in RU/EN", () => {
    const page = readFileSync("app/ankh-test/page.tsx", "utf8");
    const panel = readFileSync("components/ankh/ConnectedHarnessPanel.tsx", "utf8");
    expect(page).toContain('process.env.NODE_ENV !== "development"');
    expect(page).toContain('process.env.ANKH_HARNESS_ENABLED !== "true"');
    expect(panel).toContain("Только синтетические данные");
    expect(panel).toContain("Synthetic data only");
    expect(panel).toContain("Что проверяет Карен");
    expect(panel).toContain("What Karen reviews");
  });
});
