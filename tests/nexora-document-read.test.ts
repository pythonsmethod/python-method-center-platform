import { describe, expect, it, vi } from "vitest";
import { readDocument, type DocumentReadGrant, type DocumentReadProvider, type DocumentReadRequest } from "@/lib/nexora/document-read";

function setup(organizationId = "synthetic-a") {
  const request: DocumentReadRequest = {
    version: "1", operationId: "operation-1", scope: { organizationId, applicationId: "app", actorId: "actor", subjectId: "subject" },
    source: { id: "source", version: "v1", attachment: { name: "synthetic.txt", mediaType: "text/plain", data: Buffer.from("NO PHI: 12,3").toString("base64") } },
    policy: { id: "synthetic-copy", version: "1", system: "Copy only.", instruction: "Read this source.", maxTokens: 100 }
  };
  const grant: DocumentReadGrant = { scope: { ...request.scope }, source: { id: "source", version: "v1" }, providerId: "fixture", maxBytes: 1024 };
  const provider: DocumentReadProvider = { id: "fixture", model: "no-network", read: vi.fn<DocumentReadProvider["read"]>(async () => ({ outcome: "complete", text: "12,3" })) };
  return { request, grant, provider };
}
describe("NEXORA document.read v1", () => {
  it("returns source/version/operation evidence without upgrading trust", async () => {
    const { request, grant, provider } = setup();
    const result = await readDocument(request, grant, provider);
    expect(result).toMatchObject({ outcome: "complete", text: "12,3", receipt: {
      operationId: "operation-1", capability: "document.read", version: "1", logicalReadCalls: 1,
      verification: "NOT_VERIFIED", source: { id: "source", version: "v1", contentSha256: expect.stringMatching(/^[a-f0-9]{64}$/) }
    } });
    expect(JSON.stringify(result.receipt)).not.toContain("NO PHI");
    expect(JSON.stringify(result.receipt)).not.toContain("12,3");
    expect(provider.read).toHaveBeenCalledTimes(1);
  });
  it.each(["organizationId", "applicationId", "actorId", "subjectId"] as const)("rejects a different %s before reading", async key => {
    const { request, grant, provider } = setup();
    request.scope[key] = "foreign";
    expect(await readDocument(request, grant, provider)).toMatchObject({ outcome: "refused", code: "FORBIDDEN" });
    expect(provider.read).not.toHaveBeenCalled();
  });
  it("does not accept a different source or a stale version", async () => {
    const { request, grant, provider } = setup();
    request.source.id = "foreign";
    expect(await readDocument(request, grant, provider)).toMatchObject({ code: "FORBIDDEN" });
    request.source.id = "source"; request.source.version = "v0";
    expect(await readDocument(request, grant, provider)).toMatchObject({ code: "STALE_SOURCE" });
    expect(provider.read).not.toHaveBeenCalled();
  });
  it.each(["", "not base64", "AA=A", "YR=="])("rejects malformed bytes (%s)", async data => {
    const { request, grant, provider } = setup(); request.source.attachment.data = data;
    expect(await readDocument(request, grant, provider)).toMatchObject({ code: "INVALID_REQUEST" });
    expect(provider.read).not.toHaveBeenCalled();
  });
  it("enforces the allowed provider, media type and actual byte limit", async () => {
    const { request, grant, provider } = setup();
    grant.providerId = "unapproved";
    expect(await readDocument(request, grant, provider)).toMatchObject({ code: "FORBIDDEN" });
    grant.providerId = "fixture"; request.source.attachment.mediaType = "application/zip";
    expect(await readDocument(request, grant, provider)).toMatchObject({ code: "UNSUPPORTED_INPUT" });
    request.source.attachment.mediaType = "text/plain"; grant.maxBytes = 1;
    expect(await readDocument(request, grant, provider)).toMatchObject({ code: "INVALID_REQUEST" });
    expect(provider.read).not.toHaveBeenCalled();
  });
  it.each(["PROVIDER_UNAVAILABLE", "PROVIDER_FAILED", "INCOMPLETE_RESPONSE"] as const)("keeps %s separate from a reading, with no fallback", async code => {
    const { request, grant, provider } = setup(); vi.mocked(provider.read).mockResolvedValue({ outcome: "failed", code });
    const result = await readDocument(request, grant, provider);
    expect(result).toMatchObject({ outcome: "failed", code }); expect(result).not.toHaveProperty("text");
    expect(provider.read).toHaveBeenCalledTimes(1);
  });
  it("does not publish refusal text or echo an unsafe provider error", async () => {
    const { request, grant, provider } = setup(); vi.mocked(provider.read).mockResolvedValueOnce({ outcome: "refused" });
    expect(await readDocument(request, grant, provider)).toMatchObject({ outcome: "refused", code: "PROVIDER_REFUSAL" });
    vi.mocked(provider.read).mockRejectedValueOnce(new Error("secret and document contents"));
    expect(JSON.stringify(await readDocument(request, grant, provider))).not.toContain("secret");
  });
  it("two applications can use the contract without sharing a result or grant", async () => {
    const a = setup("tenant-a"), b = setup("tenant-b");
    vi.mocked(b.provider.read).mockResolvedValue({ outcome: "complete", text: "other result" });
    const [first, second] = await Promise.all([readDocument(a.request, a.grant, a.provider), readDocument(b.request, b.grant, b.provider)]);
    expect(first).toMatchObject({ text: "12,3", receipt: { scope: { organizationId: "tenant-a" } } });
    expect(second).toMatchObject({ text: "other result", receipt: { scope: { organizationId: "tenant-b" } } });
    expect(await readDocument(b.request, a.grant, b.provider)).toMatchObject({ code: "FORBIDDEN" });
    expect(b.provider.read).toHaveBeenCalledTimes(1);
  });
});
