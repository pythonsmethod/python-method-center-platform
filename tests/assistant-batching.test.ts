import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_BYTES
} from "@/lib/assistant/attachments";
import { splitIntoBatches, type PreparedFile } from "@/lib/assistant/prepare-files";

function file(id: number, bytes: number): PreparedFile {
  return {
    id: String(id),
    name: `photo-${id}.jpg`,
    mediaType: "image/jpeg",
    data: "x",
    bytes
  };
}

describe("splitting attachments into requests", () => {
  it("keeps a small set in one request", () => {
    const batches = splitIntoBatches([file(1, 200_000), file(2, 200_000)]);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });

  it("splits thirty photos of analyses into carriable parts", () => {
    const photos = Array.from({ length: 30 }, (_, index) =>
      file(index, 250_000)
    );

    const batches = splitIntoBatches(photos);

    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flat()).toHaveLength(30);

    for (const batch of batches) {
      expect(batch.length).toBeLessThanOrEqual(MAX_ATTACHMENTS);
      expect(
        batch.reduce((sum, item) => sum + item.bytes, 0)
      ).toBeLessThanOrEqual(MAX_TOTAL_ATTACHMENT_BYTES);
    }
  });

  it("splits by weight, not only by count", () => {
    const heavy = Array.from({ length: 6 }, (_, index) =>
      file(index, 1_000_000)
    );

    const batches = splitIntoBatches(heavy);

    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) {
      expect(
        batch.reduce((sum, item) => sum + item.bytes, 0)
      ).toBeLessThanOrEqual(MAX_TOTAL_ATTACHMENT_BYTES);
    }
  });

  it("never loses a file and never duplicates one", () => {
    const files = Array.from({ length: 17 }, (_, index) =>
      file(index, 400_000)
    );

    const ids = splitIntoBatches(files)
      .flat()
      .map((item) => item.id);

    expect(new Set(ids).size).toBe(17);
  });

  it("returns nothing for an empty selection", () => {
    expect(splitIntoBatches([])).toEqual([]);
  });
});
