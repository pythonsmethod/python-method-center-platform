import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ version: "2026-09-13T00:00:00Z", value: "12", metadata: {} as Record<string, unknown> }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ from: (table: string) => {
  const data = () => table === "uploaded_documents" ? [{ id: "doc", original_filename: "synthetic", document_status: "ready", created_at: "2026-09-12T00:00:00Z" }]
    : table === "document_extractions" ? [{ id: "ex", document_id: "doc", extracted_at: state.version, agreed_values: [{ file: "synthetic", section: "lab", label: "Synthetic marker", value: state.value, reference: "", confident: false }], disputed_values: [] }]
    : table === "admin_notes" ? [{ id: "note", metadata: state.metadata, created_at: "2026-09-13T01:00:00Z" }]
    : table === "analysis_runs" ? null : [];
  const query = { select: () => query, eq: () => query, is: () => query, order: () => query, limit: () => query, maybeSingle: () => query, in: () => query,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: data(), error: null }).then(resolve) };
  return query;
} }) }));
import { getCaseAnalyticalPicture } from "@/lib/analytical-picture/queries";
async function current() { const result = await getCaseAnalyticalPicture("case"); if (result.status !== "ready") throw new Error("not ready"); return result.picture.extractedEvidence[0]; }
beforeEach(() => { state.value = "12"; state.version = "2026-09-13T00:00:00Z"; state.metadata = {}; });
describe("snapshot note readback after reprocessing", () => {
  it("applies only exact snapshot, retaining original source and review trust", async () => {
    const first = await current();
    state.metadata = { kind: "case_picture_evidence_review", evidence_id: first.id, document_id: "doc", snapshot: first.reviewSnapshot, snapshot_token: first.reviewToken, decision: "CORRECTED", correction: "1,2" };
    const reviewed = await current(); expect(reviewed.reviewDecision).toBe("CORRECTED"); expect(reviewed.value).toBe("12"); expect(reviewed.correction).toBe("1,2"); expect(reviewed.trustState).not.toBe("VERIFIED");
    state.value = "999"; const changed = await current(); expect(changed.reviewDecision).toBe("PENDING"); expect(changed.correction).toBeNull();
    expect(state.metadata.correction).toBe("1,2");
  });
  it("does not carry confirmation to a new extraction version even with identical digits", async () => {
    const first = await current(); state.metadata = { kind: "case_picture_evidence_review", evidence_id: first.id, document_id: "doc", snapshot: first.reviewSnapshot, snapshot_token: first.reviewToken, decision: "CONFIRMED" };
    state.version = "2026-09-14T00:00:00Z"; expect((await current()).reviewDecision).toBe("PENDING");
  });
  it("does not apply legacy index-only decisions", async () => {
    state.metadata = { kind: "case_picture_evidence_review", evidence_id: "ex-agreed-0", document_id: "doc", decision: "CONFIRMED" };
    expect((await current()).reviewDecision).toBe("PENDING");
  });
});
