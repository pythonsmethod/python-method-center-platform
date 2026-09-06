import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectVisualFillEvidence } from "@/lib/documents/visual-fill";

async function form(bodyInk: boolean, monochrome = false): Promise<Buffer> {
  const width = 600;
  const height = 900;
  const base = await sharp({ create: { width, height, channels: 3, background: "white" } })
    .composite([
      { input: Buffer.from('<svg width="600" height="900"><g stroke="#555" stroke-width="2"><path d="M40 80H560M40 250H560M40 400H560M40 550H560M40 700H560"/></g></svg>'), top: 0, left: 0 },
      { input: Buffer.from(`<svg width="600" height="900"><path d="M80 160q60 25 130 0" fill="none" stroke="${monochrome ? "#222" : "#165dcc"}" stroke-width="8"/></svg>`), top: 0, left: 0 },
      ...(bodyInk ? [{ input: Buffer.from(`<svg width="600" height="900"><path d="M120 470q100 35 230 -5" fill="none" stroke="${monochrome ? "#222" : "#165dcc"}" stroke-width="8"/></svg>`), top: 0, left: 0 }] : []),
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
  return base;
}

describe("visual medical-form fill evidence", () => {
  it("finds coloured handwriting in the clinical body", async () => {
    expect((await detectVisualFillEvidence(await form(true))).signal).toBe("BODY_CHROMATIC_INK");
  });

  it("distinguishes a form filled only in its header", async () => {
    expect((await detectVisualFillEvidence(await form(false))).signal).toBe("HEADER_ONLY_CHROMATIC_INK");
  });

  it("fails closed for monochrome handwriting", async () => {
    expect((await detectVisualFillEvidence(await form(false, true))).signal).toBe("INCONCLUSIVE");
  });

  it("does not mistake a cyan-tinted photographed sheet for pen ink", async () => {
    const input = await sharp({
      create: { width: 384, height: 640, channels: 3, background: { r: 170, g: 205, b: 210 } }
    }).jpeg().toBuffer();

    expect(await detectVisualFillEvidence(input)).toMatchObject({
      signal: "INCONCLUSIVE",
      headerInkRatio: 0,
      bodyInkRatio: 0,
    });
  });
});
