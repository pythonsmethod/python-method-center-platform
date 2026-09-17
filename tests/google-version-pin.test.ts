import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleDocumentAIProvider } from "@/lib/document-extraction/google-document-ai";
import { runRasterStress } from "@/lib/document-extraction/synthetic-raster-stress";
import { SYNTHETIC_PROCESSOR } from "@/lib/document-extraction/synthetic-processor-manifest";

describe("explicit Google processor version", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("pins online and batch URLs while metadata stays processor-scoped", async () => {
    const fetcher = vi.fn(async () => Response.json({}));
    const provider = new GoogleDocumentAIProvider({ ...SYNTHETIC_PROCESSOR, accessToken: async () => "test", fetchImpl: fetcher });
    await provider.process_document({ bytes: Buffer.from("synthetic"), mimeType: "text/plain" });
    await provider.batch_process_documents({ inputGcsUri: "gs://synthetic/in", outputGcsUri: "gs://synthetic/out" });
    await provider.get_processor_status();
    const urls = fetcher.mock.calls as unknown as [string][];
    expect(urls[0][0]).toContain(`/processorVersions/${SYNTHETIC_PROCESSOR.processorVersionId}:process`);
    expect(urls[1][0]).toContain(`/processorVersions/${SYNTHETIC_PROCESSOR.processorVersionId}:batchProcess`);
    expect(urls[2][0]).not.toContain("processorVersions");
  });
  it.each(["", "latest", "stable", "default", "rc", "../version", "version?x=1"])("rejects unsafe or mutable pin %s", pin => {
    expect(() => new GoogleDocumentAIProvider({ ...SYNTHETIC_PROCESSOR, processorVersionId: pin, accessToken: async () => "test" })).toThrow();
  });
  it("does not turn OCR text into Gold-derived canonical facts or claim downstream success", async () => {
    const fetcher = vi.fn(async () => Response.json({ document: { text: "ALPHA 12,34", pages: [{ tokens: [] }] } }));
    vi.stubGlobal("fetch", fetcher);
    const result = await runRasterStress(async () => "test");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(result.versionPinned).toBe(true);
    for (const receipt of result.receipts) expect(receipt.chain).toMatchObject({
      canonicalCandidates: 0, effectiveVerified: 0, status: "BLOCKED_NO_CANONICAL_ROWS", wholeCaseReview: "NOT_RUN",
    });
  });
});
