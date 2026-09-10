import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ staff: vi.fn(), auth: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: f.staff }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: f.auth }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: f.profile }) }) }) }) }));
import { getPrivateAssistantUserState } from "@/lib/auth/require-private-assistant";
import { isFounderEmail } from "@/lib/auth/require-founder";
import { resolvePrivateAssistantRole, canAccessProfessorMessages } from "@/lib/auth/require-karen";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANHAM_ASSISTANT_DELEGATE_EMAILS", "delegate@example.test");
  f.staff.mockResolvedValue({ status: "forbidden" });
  f.auth.mockResolvedValue({ data: { user: { id: "delegate-id", email: "delegate@example.test" } }, error: null });
  f.profile.mockResolvedValue({ data: { role: "client", status: "registered" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
describe("owner-delegated assistant without admin promotion", () => {
  it("allows the confirmed account while retaining client role", async () => {
    expect(await getPrivateAssistantUserState()).toMatchObject({ status: "authorized", userId: "delegate-id", role: "client" });
    expect(resolvePrivateAssistantRole("delegate@example.test")).toBe("founder");
    expect(isFounderEmail("delegate@example.test")).toBe(false);
    expect(canAccessProfessorMessages("delegate@example.test")).toBe(false);
    expect(await f.staff()).toEqual({ status: "forbidden" });
  });
  it.each(["suspended", "closed"])("denies %s accounts", async status => {
    f.profile.mockResolvedValue({ data: { role: "client", status }, error: null });
    expect(await getPrivateAssistantUserState()).toEqual({ status: "forbidden" });
  });
  it("denies other accounts and immediately honors revocation", async () => {
    vi.stubEnv("ANHAM_ASSISTANT_DELEGATE_EMAILS", "");
    expect(await getPrivateAssistantUserState()).toEqual({ status: "forbidden" });
    expect(resolvePrivateAssistantRole("delegate@example.test")).toBe(null);
  });
  it("does not use user-supplied metadata for access", async () => {
    f.auth.mockResolvedValue({ data: { user: { id: "other", email: "other@example.test", user_metadata: { email: "delegate@example.test" } } }, error: null });
    expect(await getPrivateAssistantUserState()).toEqual({ status: "forbidden" });
  });
});
