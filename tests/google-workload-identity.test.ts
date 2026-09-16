import { describe, expect, it, vi } from "vitest";
import { createGoogleWorkloadIdentityAccessToken } from "@/lib/document-extraction/google-workload-identity";

describe("Google Workload Identity Federation", () => {
  it("exchanges Vercel OIDC without exposing a permanent key", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "federated" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "short-lived" }), { status: 200 }));
    const getToken = createGoogleWorkloadIdentityAccessToken({
      VERCEL_OIDC_TOKEN: "header.payload.signature",
      GCP_PROJECT_NUMBER: "566941322428",
      GCP_WORKLOAD_IDENTITY_POOL_ID: "anham-vercel-staging",
      GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel-anham-preview",
      GOOGLE_DOCUMENT_AI_SERVICE_ACCOUNT_EMAIL: "reader@example.iam.gserviceaccount.com",
    }, fetchImpl);
    await expect(getToken()).resolves.toBe("short-lived");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("fails closed when deployment identity is missing", async () => {
    await expect(createGoogleWorkloadIdentityAccessToken({})()).rejects.toThrow("configuration missing");
  });
});
