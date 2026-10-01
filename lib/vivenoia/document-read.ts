import { createHash } from "node:crypto";

/** Internal capability contract. Only a server adapter may issue a grant. */
export const DOCUMENT_READ_CAPABILITY = "document.read" as const;
export const DOCUMENT_READ_VERSION = "1" as const;

export type DocumentReadScope = {
  organizationId: string;
  applicationId: string;
  actorId: string;
  subjectId: string;
};
export type DocumentReadAttachment = { name: string; mediaType: string; data: string };
export type DocumentReadRequest = {
  version: typeof DOCUMENT_READ_VERSION;
  operationId: string;
  scope: DocumentReadScope;
  source: { id: string; version: string; attachment: DocumentReadAttachment };
  policy: { id: string; version: string; system: string; instruction: string; maxTokens: number };
};
export type DocumentReadGrant = {
  scope: DocumentReadScope;
  source: { id: string; version: string };
  providerId: string;
  maxBytes: number;
};
export type DocumentReadFailure =
  | "FORBIDDEN" | "STALE_SOURCE" | "INVALID_REQUEST" | "UNSUPPORTED_INPUT"
  | "PROVIDER_UNAVAILABLE" | "PROVIDER_FAILED" | "INCOMPLETE_RESPONSE";
export type DocumentReadProvider = {
  id: string;
  model: string;
  read(input: { attachment: DocumentReadAttachment; system: string; instruction: string; maxTokens: number }): Promise<
    | { outcome: "complete"; text: string }
    | { outcome: "refused" }
    | { outcome: "failed"; code: "PROVIDER_UNAVAILABLE" | "PROVIDER_FAILED" | "INCOMPLETE_RESPONSE" }
  >;
};
export type DocumentReadReceipt = {
  capability: typeof DOCUMENT_READ_CAPABILITY;
  version: typeof DOCUMENT_READ_VERSION;
  operationId: string;
  scope: DocumentReadScope;
  source: { id: string; version: string; contentSha256: string | null };
  policy: { id: string; version: string };
  provider: { id: string; model: string };
  outcome: "complete" | "refused" | "failed";
  durationMs: number;
  logicalReadCalls: number;
  // A complete provider response is still only an extracted reading.
  verification: "NOT_VERIFIED";
};
export type DocumentReadResult =
  | { outcome: "complete"; text: string; receipt: DocumentReadReceipt }
  | { outcome: "refused"; code: "FORBIDDEN" | "PROVIDER_REFUSAL"; receipt: DocumentReadReceipt }
  | { outcome: "failed"; code: DocumentReadFailure; receipt: DocumentReadReceipt };

const mediaTypes = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif",
  "text/plain", "text/markdown", "text/csv"
]);
const scopeKeys: Array<keyof DocumentReadScope> = ["organizationId", "applicationId", "actorId", "subjectId"];
const nonempty = (value: string) => typeof value === "string" && value.trim().length > 0;
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Reusable orchestration, with no PMC records, roles, prompts, storage or prices.
 * No fallback, cache, persistence or clinical trust promotion occurs here.
 * Queue locking/idempotency and durable receipt storage belong to the caller.
 */
export async function readDocument(
  request: DocumentReadRequest,
  grant: DocumentReadGrant,
  provider: DocumentReadProvider
): Promise<DocumentReadResult> {
  const started = Date.now();
  const receipt: DocumentReadReceipt = {
    capability: DOCUMENT_READ_CAPABILITY, version: DOCUMENT_READ_VERSION,
    operationId: request.operationId, scope: { ...request.scope },
    source: { id: request.source.id, version: request.source.version, contentSha256: null },
    policy: { id: request.policy.id, version: request.policy.version },
    provider: { id: provider.id, model: provider.model },
    outcome: "failed", durationMs: 0, logicalReadCalls: 0, verification: "NOT_VERIFIED"
  };
  const finish = (outcome: DocumentReadReceipt["outcome"]) => ({
    ...receipt, outcome, durationMs: Math.max(0, Date.now() - started)
  });
  const fail = (code: DocumentReadFailure): DocumentReadResult => ({ outcome: "failed", code, receipt: finish("failed") });

  if (scopeKeys.some(key => !nonempty(request.scope[key]) || request.scope[key] !== grant.scope[key]) ||
      request.source.id !== grant.source.id || provider.id !== grant.providerId) {
    return { outcome: "refused", code: "FORBIDDEN", receipt: finish("refused") };
  }
  if (request.source.version !== grant.source.version) return fail("STALE_SOURCE");
  if (request.version !== DOCUMENT_READ_VERSION ||
      ![request.operationId, request.source.id, request.source.version, request.policy.id,
        request.policy.version, request.policy.system, request.policy.instruction, provider.id, provider.model].every(nonempty) ||
      !Number.isSafeInteger(request.policy.maxTokens) || request.policy.maxTokens < 1 || request.policy.maxTokens > 32768 ||
      !Number.isSafeInteger(grant.maxBytes) || grant.maxBytes < 1 || grant.maxBytes > MAX_BYTES) return fail("INVALID_REQUEST");

  const attachment = { ...request.source.attachment };
  if (!mediaTypes.has(attachment.mediaType)) return fail("UNSUPPORTED_INPUT");
  if (!nonempty(attachment.name) || typeof attachment.data !== "string" ||
      !attachment.data.length || attachment.data.length > Math.ceil(grant.maxBytes / 3) * 4 ||
      attachment.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(attachment.data)) return fail("INVALID_REQUEST");
  const bytes = Buffer.from(attachment.data, "base64");
  if (!bytes.length || bytes.length > grant.maxBytes || bytes.toString("base64") !== attachment.data) return fail("INVALID_REQUEST");
  receipt.source.contentSha256 = createHash("sha256").update(bytes).digest("hex");
  try {
    receipt.logicalReadCalls = 1;
    const result = await provider.read({
      attachment, system: request.policy.system,
      instruction: request.policy.instruction, maxTokens: request.policy.maxTokens
    });
    if (result.outcome === "refused") return { outcome: "refused", code: "PROVIDER_REFUSAL", receipt: finish("refused") };
    if (result.outcome === "failed") return fail(result.code);
    if (result.outcome !== "complete" || typeof result.text !== "string" || !result.text.trim()) return fail("INCOMPLETE_RESPONSE");
    return { outcome: "complete", text: result.text, receipt: finish("complete") };
  } catch {
    // Provider errors can contain credentials or document text. Never echo them.
    return fail("PROVIDER_FAILED");
  }
}
