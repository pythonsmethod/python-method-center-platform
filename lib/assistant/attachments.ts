// Files and photos attached to the team assistant.
//
// Deliberately not stored anywhere: an attachment travels with one request
// to the model and is gone. Medical documents that nobody keeps cannot
// leak, and the team can drop in a photo of an analysis without thinking
// about where it will live afterwards.

export type ChatAttachment = {
  name: string;
  mediaType: string;
  // Base64 payload without the data: prefix.
  data: string;
};

// How many files a person may attach to one message. A client who sends
// thirty photos of their analyses is normal, not an edge case — the
// browser compresses them and sends them to the model in batches.
export const MAX_ATTACHMENTS_TOTAL = 30;

// Per request: serverless bodies are capped around 4.5 MB and base64
// inflates a file by a third, so one batch stays well inside that.
export const MAX_ATTACHMENTS = 12;
export const MAX_ATTACHMENT_BYTES = 2_500_000;
export const MAX_TOTAL_ATTACHMENT_BYTES = 3_200_000;

// Photos from a phone are far larger than the model needs to read a lab
// printout. Downscaling keeps the text legible and makes thirty files a
// matter of seconds instead of minutes.
// Small decimal values, reference ranges and units need more detail than a
// normal chat photo. Request batching still enforces the transport ceiling.
export const IMAGE_MAX_DIMENSION = 2400;
export const IMAGE_QUALITY = 0.9;

export const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
] as const;

export const PDF_TYPE = "application/pdf";

export const TEXT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv"
] as const;

// The picker also offers HEIC (the default on iPhone): such photos are
// converted to JPEG in the browser before they are sent anywhere.
export const ACCEPT_ATTRIBUTE = [
  "image/*",
  PDF_TYPE,
  ...TEXT_TYPES
].join(",");

export function isImageType(mediaType: string): boolean {
  return (IMAGE_TYPES as readonly string[]).includes(mediaType);
}

export function isTextType(mediaType: string): boolean {
  return (TEXT_TYPES as readonly string[]).includes(mediaType);
}

function base64Bytes(data: string): number {
  // Every 4 base64 characters carry 3 bytes, minus the padding.
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;

  return Math.floor((data.length * 3) / 4) - padding;
}

const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

// Validates an untrusted attachment list from the browser. Returns null on
// anything unexpected — the caller answers with a plain refusal rather
// than forwarding surprises to the model.
export function sanitizeAttachments(
  value: unknown
): ChatAttachment[] | null | "invalid" {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return "invalid";
  }

  if (value.length > MAX_ATTACHMENTS) {
    return "invalid";
  }

  const attachments: ChatAttachment[] = [];
  let total = 0;

  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      return "invalid";
    }

    const name = (item as { name?: unknown }).name;
    const mediaType = (item as { mediaType?: unknown }).mediaType;
    const data = (item as { data?: unknown }).data;

    if (typeof name !== "string" || !name.trim() || name.length > 200) {
      return "invalid";
    }

    if (typeof mediaType !== "string") {
      return "invalid";
    }

    const known =
      isImageType(mediaType) || isTextType(mediaType) || mediaType === PDF_TYPE;

    if (!known) {
      return "invalid";
    }

    if (typeof data !== "string" || !data || !base64Pattern.test(data)) {
      return "invalid";
    }

    const size = base64Bytes(data);

    if (size <= 0 || size > MAX_ATTACHMENT_BYTES) {
      return "invalid";
    }

    total += size;

    if (total > MAX_TOTAL_ATTACHMENT_BYTES) {
      return "invalid";
    }

    attachments.push({ name: name.trim(), mediaType, data });
  }

  return attachments;
}
