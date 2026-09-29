import { getDiagnosticCatalog } from "@nexora/diagnostic-catalog";
import { writeAuditLog } from "@/lib/audit/log";
import type { ConversationScope } from "./conversation-context";

export const DIAGNOSTIC_CATALOG_RULE = "For staff only: when a named examination, declared LOINC/GTR code or printed unit is unclear, call lookup_diagnostic_catalog with only that label/code/unit. This NEXORA catalog is reference terminology, not a patient record or reference interval. Show its version and uncertainty, and compare with saved Case evidence through the separate authorized Case tool when available. Never derive a patient value, normal range, diagnosis, missing unit or Karen decision from catalog candidates. If lookup fails or returns unknown, say so. Keep prior conversation and Case history in their existing scoped archives; do not treat a catalog result as historical evidence.";

export const DIAGNOSTIC_CATALOG_TOOL = {
  type: "function" as const,
  name: "lookup_diagnostic_catalog",
  description: "Look up an unclear laboratory test, examination name, declared code or printed unit in the versioned NEXORA reference catalog. Returns up to three terminology candidates and explicit unknown/conflict states. Never treat this as document reading, a patient result, a normal range, unit conversion, diagnosis or Karen decision.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "One test name or explicitly printed LOINC/GTR code; omit for a unit-only query. No whole document, patient name or result." },
      unit: { type: "string", description: "Unit exactly as printed. The finite code list is case-sensitive and does not convert units." }
    },
    additionalProperties: false
  }
};

/** Server-derived staff scope; no Case, source or patient record enters the shared package. */
export async function lookupDiagnosticCatalog(scope: ConversationScope, raw: unknown, channel: "text" | "voice") {
  if (!scope.private || !scope.catalogTools) return { status: "forbidden" as const };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { status: "invalid" as const };
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some(key => key !== "name" && key !== "unit") ||
    (input.name !== undefined && (typeof input.name !== "string" || input.name.length > 200 || /[\r\n]/.test(input.name))) ||
    (input.unit !== undefined && (typeof input.unit !== "string" || input.unit.length > 40 || /[\r\n]/.test(input.unit))) ||
    !(typeof input.name === "string" && input.name.trim() || typeof input.unit === "string" && input.unit.trim())) return { status: "invalid" as const };

  try {
    const result = getDiagnosticCatalog().resolve({ name: typeof input.name === "string" ? input.name.trim() : "", unit: typeof input.unit === "string" ? input.unit : null });
    const audit = await writeAuditLog({ actorId: scope.profileId, caseId: scope.caseId, action: "assistant.site_data.read",
      metadata: { channel, operation: DIAGNOSTIC_CATALOG_TOOL.name, catalog_version: result.version, state: result.state } });
    if (audit.status !== "inserted") return { status: "unavailable" as const };
    return { status: "ready" as const, source: "NEXORA diagnostic catalog", version: result.version,
      state: result.state, queryBasis: result.queryBasis, totalCandidates: result.totalCandidates,
      truncated: result.truncated, candidates: result.candidates, unit: result.unit,
      assignedStandardCode: result.assignedStandardCode, clinicalFactVerified: result.clinicalFactVerified,
      requiresHumanReview: result.requiresHumanReview,
      coverage: "Terminology candidates only. Compare the original document and its page/source separately; never fill a missing unit, date, specimen or method from this lookup. An unknown result is not evidence that the test does not exist.",
      attribution: "Contains LOINC content © Regenstrief Institute and the LOINC Committee; see loinc.org/license. GTR listings are submitter-provided and not NIH-verified." };
  } catch {
    return { status: "unavailable" as const };
  }
}
