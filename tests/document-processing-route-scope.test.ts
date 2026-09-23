import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock = vi.hoisted(() => ({ global: vi.fn(), profile: vi.fn(), case: vi.fn(), user: vi.fn(), staff: vi.fn(), expire: vi.fn(), service: vi.fn() }));
vi.mock("@/lib/documents/processing", () => ({ processNextDocument: mock.global, processNextProfileDocument: mock.profile, processNextCaseDocument: mock.case }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: mock.user } }) }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mock.service }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: mock.staff }));
vi.mock("@/lib/auth/require-karen", () => ({ canAccessProfessorMessages: (email: string) => email === "synthetic-karen@example.test" }));
vi.mock("@/lib/payments/expire-periods", () => ({ expireElapsedServicePeriods: mock.expire }));
import { POST, GET } from "@/app/api/documents/process/route";
const request = (body: unknown = {}) => new NextRequest("https://example.test/api/documents/process", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs();
  mock.service.mockReturnValue({});
  mock.user.mockResolvedValue({ data: { user: { id: "account-a" } } });
  mock.profile.mockResolvedValue({ status: "ready", documentId: "private-document" });
  mock.case.mockResolvedValue({ status: "idle" }); mock.global.mockResolvedValue({ status: "idle" });
  mock.staff.mockResolvedValue({ status: "forbidden" });
});
describe("document processing request authority", () => {
  it("uses only the authenticated account, never the global queue or submitted owner", async () => {
    const response = await POST(request({ profileId: "account-b" }));
    expect(await response.json()).toEqual({ status: "ready" });
    expect(mock.profile).toHaveBeenCalledWith("account-a"); expect(mock.global).not.toHaveBeenCalled();
    expect(mock.case).not.toHaveBeenCalled();
  });
  it("denies a guest before any queue operation", async () => {
    mock.user.mockResolvedValue({ data: { user: null } });
    expect((await POST(request())).status).toBe(401); expect(mock.profile).not.toHaveBeenCalled();
  });
  it("preserves an unavailable response when the service is unconfigured", async () => {
    mock.service.mockReturnValue(null);
    expect((await POST(request())).status).toBe(503); expect(mock.profile).not.toHaveBeenCalled();
  });
  it("a client cannot request staff processing of a chosen Case", async () => {
    expect((await POST(request({ caseId: "11111111-1111-4111-8111-111111111111" }))).status).toBe(403);
    expect(mock.case).not.toHaveBeenCalled(); expect(mock.profile).not.toHaveBeenCalled();
  });
  it("retains the authorized Karen Case path", async () => {
    mock.staff.mockResolvedValue({ status: "authorized", role: "staff", email: "synthetic-karen@example.test" });
    const caseId = "11111111-1111-4111-8111-111111111111";
    expect((await POST(request({ caseId }))).status).toBe(200); expect(mock.case).toHaveBeenCalledWith(caseId);
    expect(mock.global).not.toHaveBeenCalled();
  });
  it("keeps global processing behind the cron credential", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-test-secret");
    expect((await GET(new NextRequest("https://example.test/api/documents/process"))).status).toBe(401);
    expect(mock.global).not.toHaveBeenCalled();
    expect((await GET(new NextRequest("https://example.test/api/documents/process", { headers: { authorization: "Bearer synthetic-test-secret" } }))).status).toBe(200);
    expect(mock.global).toHaveBeenCalledOnce();
  });
});
