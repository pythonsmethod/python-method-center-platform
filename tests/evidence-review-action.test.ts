import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ staff: vi.fn(), user: vi.fn(), picture: vi.fn(), insert: vi.fn(), from: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: mock.staff }));
vi.mock("@/lib/auth/require-karen", () => ({ resolvePrivateAssistantRole: (email: string) => email === "karen@example.test" ? "karen" : null }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: mock.user } }) }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: () => ({ from: mock.from }) }));
vi.mock("@/lib/analytical-picture/queries", () => ({ getCaseAnalyticalPicture: mock.picture }));
import { saveEvidenceReview } from "@/lib/analytical-picture/actions";
import { makeReviewSnapshot, reviewSnapshotToken } from "@/lib/analytical-picture/review-snapshot";
const caseId = "11111111-1111-4111-8111-111111111111", documentId = "22222222-2222-4222-8222-222222222222";
const snapshot = () => makeReviewSnapshot({ extractionId: "extraction", documentId, extractedAt: "2026-09-13T00:00:00Z", rowKind: "agreed", rowIndex: 0, row: { label: "Synthetic", value: "12" } })!;
const evidence = () => ({ id: "evidence", documentId, reviewSnapshot: snapshot() });
function form(locale = "ru") { const data = new FormData(); Object.entries({ case_id: caseId, document_id: documentId, evidence_id: "evidence", review_token: reviewSnapshotToken(snapshot(), "evidence"), decision: "CORRECTED", correction: "1,2", locale }).forEach(([k,v]) => data.set(k,v)); return data; }
beforeEach(() => {
  vi.clearAllMocks(); mock.staff.mockResolvedValue({ status: "authorized", userId: "reviewer", email: "karen@example.test", role: "admin" });
  mock.user.mockResolvedValue({ data: { user: { id: "reviewer", email: "karen@example.test" } }, error: null });
  mock.picture.mockResolvedValue({ status: "ready", picture: { extractedEvidence: [evidence()] } });
  mock.insert.mockResolvedValue({ error: null });
  mock.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn(async () => ({ data: table === "client_cases" ? { id: caseId, profile_id: "owner" } : { id: documentId }, error: null })), insert: mock.insert };
    return query;
  });
});
const save = (data = form()) => saveEvidenceReview({ status: "idle", message: "" }, data);
describe("review action integration without live patient data", () => {
  it.each(["ru", "en"])("saves original and correction in one existing note (%s)", async locale => {
    expect((await save(form(locale))).status).toBe("success");
    expect(mock.insert).toHaveBeenCalledOnce();
    expect(mock.insert.mock.calls[0][0]).toMatchObject({ author_id: "reviewer", profile_id: "owner", metadata: { snapshot: { row: { value: "12" } }, correction: "1,2", training_eligible: false, source_verified_for_training: false } });
  });
  it.each(["unauthenticated", "forbidden", "error"])("rejects %s staff status", async status => {
    mock.staff.mockResolvedValue({ status }); expect((await save()).status).toBe("error"); expect(mock.insert).not.toHaveBeenCalled();
  });
  it("does not authorize via editable profile email", async () => {
    mock.user.mockResolvedValue({ data: { user: { id: "reviewer", email: "other@example.test" } }, error: null });
    expect((await save()).status).toBe("error"); expect(mock.insert).not.toHaveBeenCalled();
  });
  it("rejects foreign document/evidence association", async () => {
    mock.picture.mockResolvedValue({ status: "ready", picture: { extractedEvidence: [{ ...evidence(), documentId: "foreign" }] } });
    expect((await save()).status).toBe("error"); expect(mock.insert).not.toHaveBeenCalled();
  });
  it("rejects stale form after extraction changed", async () => {
    mock.picture.mockResolvedValue({ status: "ready", picture: { extractedEvidence: [{ ...evidence(), reviewSnapshot: { ...snapshot(), extractedAt: "2026-09-14T00:00:00Z" } }] } });
    const result = await save(form("en")); expect(result.message).toContain("Refresh"); expect(mock.insert).not.toHaveBeenCalled();
  });
  it("ignores client snapshot and reviewer fields", async () => {
    const data = form(); data.set("snapshot", '{"value":"999"}'); data.set("author_id", "attacker");
    await save(data); expect(mock.insert.mock.calls[0][0].metadata.snapshot.row.value).toBe("12"); expect(mock.insert.mock.calls[0][0].author_id).toBe("reviewer");
  });
  it("rejects malformed and oversized requests", async () => {
    const data = form(); data.set("case_id", "wrong"); expect((await save(data)).status).toBe("error");
    const large = form(); large.set("correction", "a".repeat(2001)); expect((await save(large)).status).toBe("error"); expect(mock.insert).not.toHaveBeenCalled();
  });
  it("reports save failure without success invalidation", async () => {
    mock.insert.mockResolvedValue({ error: { message: "failed" } }); expect((await save()).status).toBe("error"); expect(mock.revalidate).not.toHaveBeenCalled();
  });
});
