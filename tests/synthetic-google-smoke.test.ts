import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSyntheticGoogleSmoke, SYNTHETIC_LINES, syntheticPdf } from "@/lib/document-extraction/synthetic-google-smoke";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ getStaffUserState: mocks.auth }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
import { runOcrSmoke } from "@/app/(admin)/admin/anham/wif-smoke/actions";

describe("synthetic Google OCR", () => {
  beforeEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("builds a fixed PDF with correct cross-reference offsets", () => {
    const pdf = syntheticPdf().toString();
    const start = Number(/startxref\n(\d+)/.exec(pdf)?.[1]);
    expect(pdf.slice(start, start + 4)).toBe("xref");
    for (const line of SYNTHETIC_LINES) expect(pdf).toContain(line);
  });
  it("checks OCR lines and provenance from the real adapter response", async () => {
    const text = SYNTHETIC_LINES.join("\n");
    let start = 0;
    const lines = SYNTHETIC_LINES.map(line => {
      const layout = { textAnchor: { textSegments: [{ startIndex: start, endIndex: start + line.length }] }, boundingPoly: { normalizedVertices: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } };
      start += line.length + 1;
      return { layout };
    });
    const fetcher = vi.fn(async () => Response.json({ document: { text, pages: [{ pageNumber: 1, lines, tokens: lines }] } }));
    const receipt = await runSyntheticGoogleSmoke(async () => "secret", fetcher);
    expect(receipt.ok).toBe(true);
    expect(receipt.checks).toHaveLength(6);
    expect(receipt.phiSent).toBe(false);
    expect(JSON.stringify(receipt)).not.toContain("secret");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("fails empty OCR rather than treating HTTP success as accuracy", async () => {
    const result = await runSyntheticGoogleSmoke(async () => "secret", async () => Response.json({ document: {} }));
    expect(result.ok).toBe(false);
    expect(result.checks.every(c => !c.matched)).toBe(true);
  });
  it.each(["unauthenticated", "forbidden", "error"])("denies %s before network", async status => {
    mocks.auth.mockResolvedValue({ status });
    expect(await runOcrSmoke()).toBe("denied");
    expect(mocks.headers).not.toHaveBeenCalled();
  });
  it.each(["production", "development"])("denies %s", async environment => {
    mocks.auth.mockResolvedValue({ status: "authorized", role: "admin" });
    vi.stubEnv("VERCEL_ENV", environment);
    expect(await runOcrSmoke()).toBe("denied");
  });
  it("denies cross-origin requests even in isolated Preview", async () => {
    mocks.auth.mockResolvedValue({ status: "authorized", role: "admin" });
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "anham-clinical-staging-test-pythonsmethods-projects.vercel.app");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://thylrayzjczsxlyqhtfc.supabase.co");
    vi.stubEnv("ANHAM_PHI_PROCESSING_AUTHORIZED", "false");
    mocks.headers.mockResolvedValue(new Headers({ origin: "https://example.com" }));
    expect(await runOcrSmoke()).toBe("denied");
  });
});
