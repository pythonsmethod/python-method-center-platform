import sharp from "sharp";

export type VisualFillSignal = "BODY_CHROMATIC_INK" | "HEADER_ONLY_CHROMATIC_INK" | "INCONCLUSIVE";

export type VisualFillEvidence = {
  signal: VisualFillSignal;
  headerInkRatio: number;
  bodyInkRatio: number;
};

const WIDTH = 384;
const HEADER_FRACTION = 0.28;
const PRESENT_RATIO = 0.00035;
const ABSENT_RATIO = 0.00008;

// Printed forms, folds and shadows are approximately achromatic. A coloured
// pen has channel separation as well as darkness. This does not try to read
// handwriting; it only establishes where non-template ink is present.
export async function detectVisualFillEvidence(input: Buffer): Promise<VisualFillEvidence> {
  try {
    const { data, info } = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: WIDTH, withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels < 3 || info.width === 0 || info.height === 0) {
      return { signal: "INCONCLUSIVE", headerInkRatio: 0, bodyInkRatio: 0 };
    }

    const headerEnd = Math.floor(info.height * HEADER_FRACTION);
    let headerInk = 0;
    let bodyInk = 0;
    let headerPixels = 0;
    let bodyPixels = 0;
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const offset = (y * info.width + x) * info.channels;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const channels = [r, g, b].sort((left, right) => right - left);
        // Camera white balance often separates the weakest channel across an
        // entire tinted sheet. Pen ink instead has one dominant channel.
        const chromaticInk = channels[0] < 225 && channels[0] - channels[1] >= 28;
        if (y < headerEnd) {
          headerPixels += 1;
          if (chromaticInk) headerInk += 1;
        } else {
          bodyPixels += 1;
          if (chromaticInk) bodyInk += 1;
        }
      }
    }
    const headerInkRatio = headerPixels ? headerInk / headerPixels : 0;
    const bodyInkRatio = bodyPixels ? bodyInk / bodyPixels : 0;
    const signal = bodyInkRatio >= PRESENT_RATIO
      ? "BODY_CHROMATIC_INK"
      : headerInkRatio >= PRESENT_RATIO && bodyInkRatio <= ABSENT_RATIO
        ? "HEADER_ONLY_CHROMATIC_INK"
        : "INCONCLUSIVE";
    return { signal, headerInkRatio, bodyInkRatio };
  } catch {
    return { signal: "INCONCLUSIVE", headerInkRatio: 0, bodyInkRatio: 0 };
  }
}
