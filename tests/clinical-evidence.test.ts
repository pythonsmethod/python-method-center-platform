import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyClinicalDocument, extractClinicalEvidence, linkDocumentsDeterministically } from "@/lib/clinical-evidence";

const polygon = { normalizedVertices: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.3 }] };
const context = { caseId: "case-synthetic", sourceDocumentId: "doc-radiology", providerVersion: "test-provider", parserVersion: "clinical-parser-v1" };

describe("clinical document classification", () => {
  it.each([
    ["RADIOLOGY", "Mammography report\nBI-RADS: 4\nIMPRESSION: source text"],
    ["PATHOLOGY", "Surgical Pathology Report\nFINAL DIAGNOSIS: source text\nSPECIMEN: A"],
    ["PROCEDURE", "PROCEDURES PERFORMED: ultrasound-guided biopsy\nclip was placed"]
  ])("classifies %s without creating a diagnosis", (expected, text) => {
    expect(classifyClinicalDocument(text).documentType).toBe(expected);
  });
});

describe("clinical source-fact extraction", () => {
  it("extracts source text, BI-RADS, measurements and provenance conservatively", () => {
    const facts = extractClinicalEvidence([{ page: 2, coordinates: polygon, confidence: 0.96, text: "FINDINGS: Left breast mass measures 12 x 8 x 6 mm.\nIMPRESSION: Suspicious source-reported finding.\nBI-RADS: 4\nRECOMMENDATION: Ultrasound-guided biopsy." }], context);
    expect(facts.some((fact) => fact.evidenceType === "BI_RADS" && fact.codedValue === "4")).toBe(true);
    expect(facts.some((fact) => fact.evidenceType === "MEASUREMENT" && fact.laterality === null)).toBe(true);
    expect(facts.every((fact) => fact.sourcePage === 2 && fact.sourceCoordinates)).toBe(true);
    expect(facts.every((fact) => fact.verificationStatus === "VERIFIED")).toBe(true);
  });

  it("routes facts without coordinates to NEEDS_REVIEW", () => {
    const facts = extractClinicalEvidence([{ page: 1, confidence: 0.99, text: "BI-RADS: 5" }], context);
    expect(facts[0].verificationStatus).toBe("NEEDS_REVIEW");
  });

  it("extracts biomarker source statements without interpretation", () => {
    const facts = extractClinicalEvidence([{ page: 3, coordinates: polygon, confidence: 0.95, text: "ER status: Positive\nPR status: Negative\nHER2 IHC status: Negative (Score 0)" }], { ...context, sourceDocumentId: "doc-pathology" });
    expect(facts.filter((fact) => fact.evidenceType === "BIOMARKER")).toHaveLength(3);
    expect(facts.every((fact) => fact.normalizedText === null)).toBe(true);
  });
});

describe("deterministic linkage and schema", () => {
  it("links an explicit recommendation to a biopsy procedure only", () => {
    const radiology = extractClinicalEvidence([{ page: 1, coordinates: polygon, confidence: 0.95, text: "Mammography\nRECOMMENDATION: Ultrasound-guided biopsy." }], context);
    const procedure = extractClinicalEvidence([{ page: 1, coordinates: polygon, confidence: 0.95, text: "PROCEDURES PERFORMED: ultrasound-guided biopsy\nIMPRESSION: Procedure completed." }], { ...context, sourceDocumentId: "doc-procedure" });
    expect(linkDocumentsDeterministically([...radiology, ...procedure])).toContainEqual(expect.objectContaining({ linkType: "RECOMMENDS" }));
  });

  it("keeps the migration service-only and separate from canonical lab facts", () => {
    const sql = readFileSync("supabase/migrations/20260901180000_clinical_evidence_items.sql", "utf8");
    expect(sql).toContain("create table if not exists public.clinical_evidence_items");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("using (false) with check (false)");
    expect(sql).toContain("canonical_lab_fact_id uuid references public.canonical_lab_facts");
  });
});
