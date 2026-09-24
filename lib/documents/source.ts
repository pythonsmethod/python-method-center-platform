import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import type { ChatAttachment } from "@/lib/assistant/attachments";

export const DOCUMENT_PROCESSOR_VERSION = "pmc-document-chain-v1";
export type SourceAnchor = {
  level: "DOCUMENT" | "PAGE";
  page: number | null;
  sourceHash: string | null;
  excerpt: string | null;
  // A model transcription is not a measured bounding box or OCR token span.
  region: null;
  // An explicitly paired label may live in a different row on the same page.
  // Keep its separate literal row anchor; never pretend the two were one span.
  related?: SourceAnchor;
};
export type PageCoverage = {
  page: number;
  status: "COMPLETE" | "PARTIAL" | "UNREADABLE" | "NOT_READ";
  reasons: string[];
};
export type PreparedSource = {
  hash: string;
  pageCount: number;
  mediaType: string;
  page: (page: number) => Promise<ChatAttachment>;
};

/** Parse the original bytes before any model call. Never modify the stored file. */
export async function prepareDocumentSource(bytes: Uint8Array, mime: string, name: string): Promise<PreparedSource> {
  if (!bytes.length || bytes.length > 25 * 1024 * 1024) throw new Error("SOURCE_SIZE_INVALID");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const isPdf = Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-";
  if (mime === "application/pdf") {
    if (!isPdf) throw new Error("SOURCE_FORMAT_MISMATCH");
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const pageCount = pdf.getPageCount();
    if (pageCount < 1 || pageCount > 250) throw new Error("SOURCE_PAGE_LIMIT");
    return { hash, pageCount, mediaType: mime, page: async (page) => {
      if (!Number.isSafeInteger(page) || page < 1 || page > pageCount) throw new Error("SOURCE_PAGE_INVALID");
      const part = await PDFDocument.create();
      const [copied] = await part.copyPages(pdf, [page - 1]);
      part.addPage(copied);
      return { name: `${name} [page ${page}/${pageCount}]`, mediaType: mime, data: Buffer.from(await part.save()).toString("base64") };
    } };
  }
  if (isPdf || !["image/jpeg", "image/png", "image/webp"].includes(mime)) throw new Error("SOURCE_FORMAT_MISMATCH");
  const meta = await sharp(bytes, { failOn: "error", limitInputPixels: 60_000_000 }).metadata();
  if (`image/${meta.format}` !== mime || !meta.width || !meta.height || (meta.pages ?? 1) !== 1) throw new Error("SOURCE_FORMAT_MISMATCH");
  // Rotation/re-encoding affects only the provider derivative. Page linkage uses original SHA256.
  const image = await sharp(bytes, { failOn: "error", limitInputPixels: 60_000_000 }).rotate()
    .resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 92 }).toBuffer();
  return { hash, pageCount: 1, mediaType: mime, page: async (page) => {
    if (page !== 1) throw new Error("SOURCE_PAGE_INVALID");
    return { name: `${name} [page 1/1]`, mediaType: "image/jpeg", data: image.toString("base64") };
  } };
}

export function sourceAnchor(row: { source?: SourceAnchor }): SourceAnchor {
  const source = row.source;
  if (source?.level === "PAGE" && Number.isSafeInteger(source.page) && Number(source.page) > 0 && /^[a-f0-9]{64}$/.test(source.sourceHash ?? "")) return source;
  return { level: "DOCUMENT", page: null, sourceHash: null, excerpt: null, region: null };
}
