type JsonRecord = Record<string, unknown>;

export type GoogleWorkloadIdentityEnvironment = Record<string, string | undefined> & {
  VERCEL_OIDC_TOKEN?: string;
  GCP_PROJECT_NUMBER?: string;
  GCP_WORKLOAD_IDENTITY_POOL_ID?: string;
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?: string;
  GOOGLE_DOCUMENT_AI_SERVICE_ACCOUNT_EMAIL?: string;
};

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" ? value as JsonRecord : {};
}

function required(env: GoogleWorkloadIdentityEnvironment, key: keyof GoogleWorkloadIdentityEnvironment): string {
  const value = env[key]?.trim();
  if (!value) throw new Error("Google identity configuration missing");
  return value;
}

async function jsonResponse(response: Response): Promise<JsonRecord> {
  const payload = asRecord(await response.json().catch(() => null));
  if (!response.ok) throw new Error("Google identity exchange failed");
  return payload;
}

export function createGoogleWorkloadIdentityAccessToken(
  env: GoogleWorkloadIdentityEnvironment = process.env,
  fetchImpl: typeof fetch = fetch,
): () => Promise<string> {
  return async () => {
    const oidcToken = required(env, "VERCEL_OIDC_TOKEN");
    if (oidcToken.length > 16_384 || oidcToken.split(".").length !== 3) throw new Error("Google identity token is invalid");
    const projectNumber = required(env, "GCP_PROJECT_NUMBER");
    const poolId = required(env, "GCP_WORKLOAD_IDENTITY_POOL_ID");
    const providerId = required(env, "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
    const serviceAccount = required(env, "GOOGLE_DOCUMENT_AI_SERVICE_ACCOUNT_EMAIL");
    if (!/^\d+$/.test(projectNumber) || !/^[^@\s]+@[^@\s]+$/.test(serviceAccount)) throw new Error("Google identity configuration invalid");

    const audience = `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${encodeURIComponent(poolId)}/providers/${encodeURIComponent(providerId)}`;
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      subject_token: oidcToken,
    });
    const exchange = await jsonResponse(await fetchImpl("https://sts.googleapis.com/v1/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
    }));
    const federatedToken = typeof exchange.access_token === "string" ? exchange.access_token.trim() : "";
    if (!federatedToken || federatedToken.length > 16_384) throw new Error("Google identity exchange returned no token");

    const access = await jsonResponse(await fetchImpl(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(serviceAccount)}:generateAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${federatedToken}` },
      body: JSON.stringify({ scope: ["https://www.googleapis.com/auth/cloud-platform"], lifetime: "3600s" }),
    }));
    const accessToken = typeof access.accessToken === "string" ? access.accessToken.trim() : "";
    if (!accessToken || accessToken.length > 16_384) throw new Error("Google identity exchange returned no access token");
    return accessToken;
  };
}
