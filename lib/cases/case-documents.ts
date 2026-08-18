import sharp from "sharp";
import {
  MAX_ATTACHMENTS,
  PDF_TYPE,
  isImageType,
  isTextType,
  type ChatAttachment
} from "@/lib/assistant/attachments";
import { DOCUMENT_STORAGE_BUCKET } from "@/lib/documents/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Fetching a case's own uploaded analyses so the assistant can read them.
//
// Until now the only way a file reached the model was Professor Python
// re-attaching, by hand, a document the client had already uploaded — the
// platform asking him to do its work. The files are right there in private
// storage; this reads them out.
//
// Nothing is cached and nothing is copied anywhere: the bytes travel to
// the model with one request and are dropped.
//
// Photographs are shrunk on the way. Clients send their analyses as photos
// of paper, straight from a phone — four or five megabytes each — and the
// limits written for what a person types into a chat rejected every one of
// them, so a case with six pages of blood work read as "no documents could
// be read, check the file formats". The formats were fine.
//
// 1568px on the long edge is the size the model works at: anything larger
// is scaled down before it is looked at, so this throws away bytes and not
// detail. A photographed lab printout comes out around a third of a
// megabyte and stays perfectly legible.

// After shrinking, an image this size is a photograph of something that is
// not a document. Left generous on purpose.
const MAX_IMAGE_BYTES = 1_500_000;

// A PDF cannot be shrunk here, and a scanned one is legitimately heavy.
const MAX_FILE_BYTES = 25 * 1024 * 1024;

// The whole request. Well inside what the model accepts; the cap exists so
// a case with sixty files cannot build a request that simply fails.
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

// The longest edge the model reasons at.
const IMAGE_LONG_EDGE = 1568;

export type CaseDocumentRow = {
  id: string;
  storage_path: string;
  original_filename: string;
  // From the row's metadata, not from a column: uploaded_documents has no
  // mime_type column, and asking for one fails the whole query.
  mimeType: string | null;
  created_at: string;
};

// The browser's reported type, stored at upload inside metadata.
export function readMimeType(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).mime_type;

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export type CaseDocumentsResult = {
  attachments: ChatAttachment[];
  // Files present on the case but left out, and why — the team is told
  // rather than silently given a partial reading.
  skipped: { name: string; reason: "too-big" | "unsupported" | "no-room" | "unreadable" }[];
  fingerprint: string;
};

function guessMediaType(row: CaseDocumentRow): string {
  if (row.mimeType) {
    return row.mimeType;
  }

  const name = row.original_filename.toLowerCase();

  if (name.endsWith(".pdf")) return PDF_TYPE;
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".txt")) return "text/plain";

  return "application/octet-stream";
}

// What the reading was made from. Two readings of the same set of files
// produce the same string; one new upload changes it, and the stored
// reading is then known to be out of date.
export function fingerprintDocuments(
  rows: Pick<CaseDocumentRow, "id" | "created_at">[]
): string {
  return [...rows]
    .map((row) => `${row.id}:${row.created_at}`)
    .sort()
    .join("|");
}

export function isReadableType(mediaType: string): boolean {
  return isImageType(mediaType) || mediaType === PDF_TYPE || isTextType(mediaType);
}

// Down to the size the model reads at, and re-encoded as JPEG: a phone
// photograph is already lossy, so nothing is lost that was there, and the
// file becomes small enough that six pages of analyses fit in one request.
//
// Returns null when the bytes turn out not to be an image at all — better
// to report one unreadable file than to fail the whole reading.
export async function shrinkImage(
  input: Buffer
): Promise<{ bytes: Buffer; mediaType: string } | null> {
  try {
    const image = sharp(input, { failOn: "none" });
    const meta = await image.metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);

    if (longest === 0) {
      return null;
    }

    // Already small: leave it exactly as the client sent it.
    if (longest <= IMAGE_LONG_EDGE && input.byteLength <= MAX_IMAGE_BYTES) {
      return { bytes: input, mediaType: `image/${meta.format ?? "jpeg"}` };
    }

    const bytes = await image
      .rotate()
      .resize({ width: IMAGE_LONG_EDGE, height: IMAGE_LONG_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return { bytes, mediaType: "image/jpeg" };
  } catch {
    return null;
  }
}

// Downloads what fits inside one request. The caps are the model's, not
// ours: too many megabytes and the request simply fails, so the oldest
// documents are read first and the rest are reported as left out.
export async function loadCaseDocuments(
  rows: CaseDocumentRow[]
): Promise<CaseDocumentsResult | null> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const attachments: ChatAttachment[] = [];
  const skipped: CaseDocumentsResult["skipped"] = [];
  let total = 0;

  const ordered = [...rows].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  for (const row of ordered) {
    const mediaType = guessMediaType(row);

    if (!isReadableType(mediaType)) {
      skipped.push({ name: row.original_filename, reason: "unsupported" });
      continue;
    }

    if (attachments.length >= MAX_ATTACHMENTS) {
      skipped.push({ name: row.original_filename, reason: "no-room" });
      continue;
    }

    const { data, error } = await supabase.storage
      .from(DOCUMENT_STORAGE_BUCKET)
      .download(row.storage_path);

    if (error || !data) {
      skipped.push({ name: row.original_filename, reason: "unreadable" });
      continue;
    }

    const original = Buffer.from(await data.arrayBuffer());
    const shrunk = isImageType(mediaType)
      ? await shrinkImage(original)
      : { bytes: original, mediaType };

    if (!shrunk) {
      // The bytes are not an image the way the file claimed to be.
      skipped.push({ name: row.original_filename, reason: "unreadable" });
      continue;
    }

    const limit = isImageType(shrunk.mediaType) ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;

    if (shrunk.bytes.byteLength > limit) {
      skipped.push({ name: row.original_filename, reason: "too-big" });
      continue;
    }

    if (total + shrunk.bytes.byteLength > MAX_TOTAL_BYTES) {
      skipped.push({ name: row.original_filename, reason: "no-room" });
      continue;
    }

    total += shrunk.bytes.byteLength;
    attachments.push({
      name: row.original_filename,
      mediaType: shrunk.mediaType,
      data: shrunk.bytes.toString("base64")
    });
  }

  return { attachments, skipped, fingerprint: fingerprintDocuments(rows) };
}
