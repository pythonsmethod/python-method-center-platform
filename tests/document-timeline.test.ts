import { describe, expect, it } from "vitest";
import { buildDocumentTimeline } from "@/lib/documents/timeline";

function doc(id: string, name: string | null, createdAt: string) {
  return { id, original_filename: name, created_at: createdAt };
}

describe("the upload history of a case", () => {
  it("groups uploads into rounds by day, newest round first", () => {
    const rounds = buildDocumentTimeline([
      doc("a", "кровь.pdf", "2026-08-01T10:00:00Z"),
      doc("b", "моча.pdf", "2026-08-01T10:05:00Z"),
      doc("c", "узи.jpg", "2026-08-15T09:00:00Z")
    ]);

    expect(rounds.map((round) => round.dayKey)).toEqual([
      "2026-08-15",
      "2026-08-01"
    ]);
    expect(rounds[1].totalCount).toBe(2);
  });

  it("numbers repeat uploads of the same file name as versions", () => {
    const rounds = buildDocumentTimeline([
      doc("a", "Анализ крови.pdf", "2026-08-01T10:00:00Z"),
      doc("b", "анализ  крови.PDF", "2026-08-20T10:00:00Z"),
      doc("c", "анализ крови.pdf", "2026-09-10T10:00:00Z")
    ]);

    const versions = rounds
      .flatMap((round) => round.entries)
      .map((entry) => entry.version)
      .sort();

    expect(versions).toEqual([1, 2, 3]);
    // The first upload is never an "update"; the later two are.
    expect(rounds[2].updateCount).toBe(0);
    expect(rounds[1].updateCount).toBe(1);
    expect(rounds[0].updateCount).toBe(1);
  });

  it("does not merge different file names", () => {
    const rounds = buildDocumentTimeline([
      doc("a", "скан 1.jpg", "2026-08-01T10:00:00Z"),
      doc("b", "скан 2.jpg", "2026-08-01T10:01:00Z")
    ]);

    expect(rounds[0].updateCount).toBe(0);
    expect(rounds[0].entries.every((entry) => entry.version === 1)).toBe(true);
  });

  it("treats unnamed files as always new", () => {
    const rounds = buildDocumentTimeline([
      doc("a", null, "2026-08-01T10:00:00Z"),
      doc("b", null, "2026-08-02T10:00:00Z")
    ]);

    expect(rounds.every((round) => round.updateCount === 0)).toBe(true);
  });

  it("returns nothing for an empty case", () => {
    expect(buildDocumentTimeline([])).toEqual([]);
  });
});
