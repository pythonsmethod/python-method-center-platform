import { sourceAnchor } from "@/lib/documents/source";
import { createHash } from "node:crypto";

export type StoredReviewSnapshot = {
  version: "stored-extraction-review-v1";
  extractionId: string;
  documentId: string;
  extractedAt: string;
  rowKind: "agreed" | "disputed";
  rowIndex: number;
  row: unknown;
  provenance: { level: "DOCUMENT" | "PAGE"; page: number | null; sourceFileHash: string | null };
};
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return JSON.stringify(value.map(stable));
  if (value && typeof value === "object") return JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return JSON.stringify(value) ?? "null";
};
export function reviewSnapshotToken(snapshot: StoredReviewSnapshot, evidenceId: string): string {
  return createHash("sha256").update(stable({ snapshot, evidenceId })).digest("hex");
}
export function makeReviewSnapshot(input: Omit<StoredReviewSnapshot, "version" | "provenance">): StoredReviewSnapshot | null {
  if (!Number.isFinite(Date.parse(input.extractedAt)) || !Number.isSafeInteger(input.rowIndex) || input.rowIndex < 0 || !input.row || typeof input.row !== "object") return null;
  const source = sourceAnchor(input.row as { source?: import("@/lib/documents/source").SourceAnchor });
  return structuredClone({ ...input, version: "stored-extraction-review-v1", provenance: { level: source.level, page: source.page, sourceFileHash: source.sourceHash } });
}
export function reviewMatchesSnapshot(metadata: { snapshot?: StoredReviewSnapshot; snapshot_token?: string; evidence_id?: string; document_id?: string }, current: StoredReviewSnapshot | null | undefined, evidenceId: string): boolean {
  if (!current || !metadata.snapshot || metadata.document_id !== current.documentId || metadata.evidence_id !== evidenceId) return false;
  const token = reviewSnapshotToken(current, evidenceId);
  return token === metadata.snapshot_token && reviewSnapshotToken(metadata.snapshot, evidenceId) === token;
}
