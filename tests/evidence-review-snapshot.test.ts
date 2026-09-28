import { describe, expect, it } from "vitest";
import { makeReviewSnapshot, reviewMatchesSnapshot, reviewSnapshotToken } from "@/lib/analytical-picture/review-snapshot";

const input = () => ({ extractionId: "extraction", documentId: "document", extractedAt: "2026-09-13T00:00:00Z", rowKind: "agreed" as const, rowIndex: 0, row: { label: "Synthetic marker", value: "12", unit: "mg/L" } });
describe("source-version-bound review metadata", () => {
  it("captures a detached row and preserves explicit missing source provenance", () => {
    const original = input(); const snapshot = makeReviewSnapshot(original)!; original.row.value = "999";
    expect(snapshot.row).toMatchObject({ value: "12" });
    expect(snapshot.provenance).toEqual({ level: "DOCUMENT", page: null, sourceFileHash: null });
  });
  it("accepts matching snapshot and detects changed value, version, unit, document or alternate view", () => {
    const snapshot = makeReviewSnapshot(input())!;
    const metadata = { snapshot, snapshot_token: reviewSnapshotToken(snapshot, "id"), evidence_id: "id", document_id: "document" };
    expect(reviewMatchesSnapshot(metadata, snapshot, "id")).toBe(true);
    for (const change of [{ row: { value: "999" } }, { extractedAt: "2026-09-14T00:00:00Z" }, { documentId: "other" }, { row: { label: "Synthetic marker", value: "12", unit: "g/L" } }]) {
      expect(reviewMatchesSnapshot(metadata, { ...snapshot, ...change }, "id")).toBe(false);
    }
    expect(reviewMatchesSnapshot(metadata, snapshot, "id-alternate")).toBe(false);
  });
  it("preserves but does not apply legacy notes or tampered snapshots", () => {
    const snapshot = makeReviewSnapshot(input())!;
    expect(reviewMatchesSnapshot({ evidence_id: "id", document_id: "document" }, snapshot, "id")).toBe(false);
    expect(reviewMatchesSnapshot({ snapshot: { ...snapshot, row: { value: "999" } }, snapshot_token: reviewSnapshotToken(snapshot, "id"), evidence_id: "id", document_id: "document" }, snapshot, "id")).toBe(false);
  });
  it("does not substitute array index for missing version", () => {
    expect(makeReviewSnapshot({ ...input(), extractedAt: "" })).toBeNull();
    expect(makeReviewSnapshot({ ...input(), rowIndex: -1 })).toBeNull();
  });
});
