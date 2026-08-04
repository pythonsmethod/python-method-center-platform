import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
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

export type CaseDocumentRow = {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  created_at: string;
};

export type CaseDocumentsResult = {
  attachments: ChatAttachment[];
  // Files present on the case but left out, and why — the team is told
  // rather than silently given a partial reading.
  skipped: { name: string; reason: "too-big" | "unsupported" | "no-room" | "unreadable" }[];
  fingerprint: string;
};

function guessMediaType(row: CaseDocumentRow): string {
  if (row.mime_type) {
    return row.mime_type;
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

    const bytes = Buffer.from(await data.arrayBuffer());

    if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
      skipped.push({ name: row.original_filename, reason: "too-big" });
      continue;
    }

    if (total + bytes.byteLength > MAX_TOTAL_ATTACHMENT_BYTES) {
      skipped.push({ name: row.original_filename, reason: "no-room" });
      continue;
    }

    total += bytes.byteLength;
    attachments.push({
      name: row.original_filename,
      mediaType,
      data: bytes.toString("base64")
    });
  }

  return { attachments, skipped, fingerprint: fingerprintDocuments(rows) };
}
