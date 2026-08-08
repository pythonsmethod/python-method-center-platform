import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { shrinkImage } from "@/lib/cases/case-documents";

// Reading a client's analyses when they arrive as photographs of paper.
//
// This is how they actually arrive. Someone lays their blood work on a
// table, photographs six pages with a phone, and each file is four or five
// megabytes. The limits here were written for what a person types into a
// chat window — two and a half megabytes — so every page was rejected and
// the case page said "no document could be read, check the file formats".
//
// The formats were fine. The photographs were simply photographs.
//
// 1568px on the long edge is the size the model reasons at: anything bigger
// is scaled down before it is looked at. Shrinking to that throws away
// bytes, not detail.

// A photograph the size a modern phone takes, with enough texture that it
// cannot compress down to nothing.
async function phonePhoto(width = 4032, height = 3024): Promise<Buffer> {
  const noise = Buffer.alloc(width * height * 3);

  for (let i = 0; i < noise.length; i++) {
    noise[i] = (i * 7919) % 256;
  }

  return sharp(noise, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("a page of analyses photographed with a phone", () => {
  it("comes back small enough to send", async () => {
    const photo = await phonePhoto();

    // The size that used to be rejected outright.
    expect(photo.byteLength).toBeGreaterThan(2_500_000);

    const result = await shrinkImage(photo);

    expect(result).not.toBeNull();
    expect(result!.bytes.byteLength).toBeLessThan(1_500_000);
    expect(result!.mediaType).toBe("image/jpeg");
  }, 30_000);

  it("keeps the long edge at the size the model reads", async () => {
    const result = await shrinkImage(await phonePhoto());
    const meta = await sharp(result!.bytes).metadata();

    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(1568);
  }, 30_000);

  it("leaves six pages room in one request", async () => {
    // The case that failed: six photographs of one person's blood work.
    const photo = await phonePhoto();
    const shrunk = await shrinkImage(photo);
    const six = shrunk!.bytes.byteLength * 6;

    expect(six).toBeLessThan(14_000_000);
  }, 60_000);
});

describe("images that need nothing done to them", () => {
  it("are passed through exactly as the client sent them", async () => {
    const small = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#888" }
    })
      .png()
      .toBuffer();

    const result = await shrinkImage(small);

    // Byte-for-byte: re-encoding a small file would only lose quality.
    expect(result!.bytes.equals(small)).toBe(true);
    expect(result!.mediaType).toBe("image/png");
  });

  it("shrinks a small image that is nonetheless enormous on disk", async () => {
    // Wide and short, so it passes the edge test and fails on bytes.
    const wide = await sharp({
      create: { width: 1500, height: 1400, channels: 3, background: "#123456" }
    })
      .png({ compressionLevel: 0 })
      .toBuffer();

    expect(wide.byteLength).toBeGreaterThan(1_500_000);

    const result = await shrinkImage(wide);

    expect(result!.bytes.byteLength).toBeLessThan(1_500_000);
    expect(result!.mediaType).toBe("image/jpeg");
  }, 30_000);
});

describe("what is not an image at all", () => {
  it("is reported rather than allowed to fail the whole reading", async () => {
    // One bad file must not cost the other five their reading.
    expect(await shrinkImage(Buffer.from("this is not a picture"))).toBeNull();
    expect(await shrinkImage(Buffer.alloc(0))).toBeNull();
  });
});
