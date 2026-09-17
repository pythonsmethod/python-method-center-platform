import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  auth: vi.fn(),
  token: vi.fn(),
}));

vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: state.auth }));
vi.mock("@/lib/document-extraction/google-workload-identity", () => ({
  createGoogleWorkloadIdentityAccessToken: () => state.token,
}));

import { GET } from "@/app/api/admin/anham/wif-smoke/route";

const request = () => new Request("https://preview.example/api/admin/anham/wif-smoke", {
  headers: { "x-vercel-oidc-token": "header.payload.signature" },
});

describe("Anham WIF smoke route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VERCEL_ENV = "preview";
    process.env.ANHAM_PHI_PROCESSING_AUTHORIZED = "false";
  });

  it("denies unauthenticated callers", async () => {
    state.auth.mockResolvedValue({ status: "unauthenticated" });
    expect((await GET(request())).status).toBe(401);
    expect(state.token).not.toHaveBeenCalled();
  });

  it("denies non-admin staff", async () => {
    state.auth.mockResolvedValue({ status: "authorized", role: "support", userId: "s", email: null });
    expect((await GET(request())).status).toBe(403);
  });

  it("is unavailable outside Preview", async () => {
    state.auth.mockResolvedValue({ status: "authorized", role: "admin", userId: "a", email: null });
    process.env.VERCEL_ENV = "production";
    expect((await GET(request())).status).toBe(404);
  });

  it("returns only a bounded success receipt", async () => {
    state.auth.mockResolvedValue({ status: "authorized", role: "admin", userId: "a", email: null });
    state.token.mockResolvedValue("short-lived-secret");
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, credential: "short_lived", documentSent: false, phiSent: false });
  });
});
