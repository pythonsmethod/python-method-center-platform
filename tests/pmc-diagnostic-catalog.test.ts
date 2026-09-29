import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ audit: vi.fn(), pilot: vi.fn(), picture: vi.fn() }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: mock.audit }));
vi.mock("@/lib/documents/pilot", () => ({ getDocumentChainPilotStatus: mock.pilot }));
vi.mock("@/lib/analytical-picture/queries", () => ({ getCaseAnalyticalPicture: mock.picture }));

import { lookupDiagnosticCatalog, DIAGNOSTIC_CATALOG_TOOL } from "@/lib/assistant/diagnostic-catalog-tool";
import { DOCUMENT_EVIDENCE_TOOL, readCaseDocumentEvidence } from "@/lib/assistant/document-evidence-tool";
import { availableConversationTools, executeConversationArchiveTool, withConversationArchive } from "@/lib/assistant/conversation-archive";
import { runVoiceSiteTool, voiceSiteTools } from "@/lib/assistant/voice-site-tools";

const caseId = "22222222-2222-4222-8222-222222222222";
const extractionId = "33333333-3333-4333-8333-333333333333";
const evidenceId = `${extractionId}-agreed-0`;
const scope = { profileId: "11111111-1111-4111-8111-111111111111", private: true, caseId, catalogTools: true as const };
const actor = { scope: "karen" as const, profileId: scope.profileId, caseId, tier: "registered" as const, email: "karen@example.test" };

beforeEach(() => {
  vi.clearAllMocks();
  mock.audit.mockResolvedValue({ status: "inserted" });
  mock.pilot.mockResolvedValue("enabled");
  mock.picture.mockResolvedValue({ status: "ready", picture: {
    documents: [], comparisons: [], missingContext: [],
    extractedEvidence: [{ id: evidenceId, label: "Test", value: "LOINC: 1988-5", provenance: { level: "PAGE", page: 2, sourceHash: "synthetic-hash" }, trustState: "SOURCE_ONLY" }]
  } });
});

describe("NEXORA reference lookup in staff ANHAM", () => {
  it("resolves an explicit code and a printed unit without verifying the clinical fact", async () => {
    const result = await lookupDiagnosticCatalog(scope, { name: "LOINC: 1988-5", unit: "mg/L" }, "text");
    expect(result).toMatchObject({ status: "ready", source: "NEXORA diagnostic catalog", version: "pmc-catalog-2026-09-28-v0.1",
      state: "declared_code_found", totalCandidates: 1, candidates: [{ system: "LOINC", code: "1988-5" }],
      unit: { original: "mg/L", listedCaseSensitiveCode: true, conversionPerformed: false },
      assignedStandardCode: null, clinicalFactVerified: false, requiresHumanReview: true });
    expect(mock.audit).toHaveBeenCalledWith(expect.objectContaining({ actorId: scope.profileId, caseId,
      metadata: expect.objectContaining({ operation: DIAGNOSTIC_CATALOG_TOOL.name, catalog_version: result.version }) }));
    expect(JSON.stringify(mock.audit.mock.calls)).not.toContain("1988-5");
  });

  it("keeps unknown names and unit-only lookups explicit", async () => {
    expect(await lookupDiagnosticCatalog(scope, { name: "fictional analyte qwerty 98765" }, "text"))
      .toMatchObject({ status: "ready", state: "unknown", totalCandidates: 0, clinicalFactVerified: false });
    expect(await lookupDiagnosticCatalog(scope, { unit: "mg/L" }, "text"))
      .toMatchObject({ status: "ready", state: "unknown", unit: { listedCaseSensitiveCode: true, conversionPerformed: false } });
    expect(await lookupDiagnosticCatalog(scope, { unit: "not_a_unit" }, "text"))
      .toMatchObject({ status: "ready", unit: { listedCaseSensitiveCode: false } });
  });

  it("exposes the same read-only tool in staff text and voice, never in client tools", async () => {
    const text = await withConversationArchive(scope, async () => {
      expect(availableConversationTools().some(tool => tool.name === DIAGNOSTIC_CATALOG_TOOL.name)).toBe(true);
      return executeConversationArchiveTool(DIAGNOSTIC_CATALOG_TOOL.name, { name: "Глюкоза крови" });
    });
    expect(voiceSiteTools("karen", actor).some(tool => tool.name === DIAGNOSTIC_CATALOG_TOOL.name)).toBe(true);
    const voice = await runVoiceSiteTool(actor, DIAGNOSTIC_CATALOG_TOOL.name, { name: "Глюкоза крови" }, "UTC");
    expect(voice).toEqual(text);
    expect(text).toMatchObject({ status: "ready", state: "candidates", candidates: [{ system: "PMC_FAMILY", code: "PMC-FAMILY-0025" }], clinicalFactVerified: false });
    expect(voiceSiteTools("client").some(tool => tool.name === DIAGNOSTIC_CATALOG_TOOL.name)).toBe(false);
    expect(await withConversationArchive({ ...scope, catalogTools: undefined }, () => executeConversationArchiveTool(DIAGNOSTIC_CATALOG_TOOL.name, { name: "CRP" }))).toMatchObject({ status: "invalid" });
    expect(await lookupDiagnosticCatalog({ ...scope, catalogTools: undefined }, { name: "CRP" }, "text")).toEqual({ status: "forbidden" });
    await expect(runVoiceSiteTool({ ...actor, scope: "client" }, DIAGNOSTIC_CATALOG_TOOL.name, { name: "CRP" }, "UTC"))
      .rejects.toMatchObject({ status: 403 });
  });

  it("rejects model-selected scope, whole-document input and missing audit", async () => {
    expect(await lookupDiagnosticCatalog({ ...scope, private: false }, { name: "CRP" }, "text")).toEqual({ status: "forbidden" });
    for (const input of [{ name: "CRP", caseId: "foreign" }, { name: "x".repeat(201) }, { name: "line\npatient" }, {}])
      expect(await lookupDiagnosticCatalog(scope, input, "text")).toEqual({ status: "invalid" });
    expect(mock.audit).not.toHaveBeenCalled();
    mock.audit.mockResolvedValue({ status: "failed" });
    expect(await lookupDiagnosticCatalog(scope, { name: "CRP" }, "voice")).toEqual({ status: "unavailable" });
  });
});

describe("source-bound lookup from new Case document evidence", () => {
  it("keeps the exact saved row and page linked to the reference candidate in text and voice", async () => {
    const args = { catalogEvidenceId: evidenceId };
    const text = await withConversationArchive(scope, () => executeConversationArchiveTool(DOCUMENT_EVIDENCE_TOOL.name, args));
    const voice = await runVoiceSiteTool(actor, DOCUMENT_EVIDENCE_TOOL.name, args, "UTC");
    expect(voice).toEqual(text);
    expect(text).toMatchObject({ status: "ready", evidence: [{ id: evidenceId, trustState: "SOURCE_ONLY" }],
      catalogLookup: { evidenceId, provenance: { page: 2, sourceHash: "synthetic-hash" }, status: "ready",
        state: "declared_code_found", candidates: [{ code: "1988-5" }], clinicalFactVerified: false } });
    expect(mock.picture).toHaveBeenCalledWith(caseId);
  });

  it("does not invent a candidate for a foreign row or a Case outside the pilot", async () => {
    expect(await readCaseDocumentEvidence(scope, { catalogEvidenceId: "44444444-4444-4444-8444-444444444444-agreed-0" }, "text"))
      .toMatchObject({ status: "not_found" });
    expect(mock.audit).not.toHaveBeenCalled();
    mock.pilot.mockResolvedValue("paused");
    expect(await readCaseDocumentEvidence(scope, { catalogEvidenceId: evidenceId }, "text"))
      .toMatchObject({ status: "unavailable" });
    expect(await readCaseDocumentEvidence({ ...scope, private: false }, { catalogEvidenceId: evidenceId }, "text"))
      .toMatchObject({ status: "forbidden" });
  });
});
