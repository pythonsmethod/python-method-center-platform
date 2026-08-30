import type { Locale } from "@/lib/i18n/locale";

export const DOCUMENT_STORAGE_BUCKET = "client-documents";

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp"
] as const;

export type AllowedDocumentMimeType =
  (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export type DocumentFileValidationResult =
  | {
      status: "valid";
      mimeType: AllowedDocumentMimeType;
      safeFilename: string;
    }
  | {
      status: "invalid";
      message: string;
    };

const extensionMimeTypes: Record<string, AllowedDocumentMimeType> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp"
};

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

function getFileExtension(filename: string): string {
  const extension = filename.split(".").pop();
  return extension?.trim().toLowerCase() ?? "";
}

export function sanitizeOriginalFilename(filename: string): string {
  const lastSegment = filename.split(/[\\/]/).pop()?.trim() ?? "";
  const cleaned = lastSegment
    .replace(/[\u0000-\u001f<>:"|?*]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const asciiSafe = cleaned
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160)
    .trim();

  return asciiSafe || "document";
}

export function resolveAllowedDocumentMimeType(
  filename: string,
  mimeType: string
): AllowedDocumentMimeType | null {
  const normalizedMimeType = normalizeMimeType(mimeType);

  if (normalizedMimeType) {
    return ALLOWED_DOCUMENT_MIME_TYPES.includes(
      normalizedMimeType as AllowedDocumentMimeType
    )
      ? (normalizedMimeType as AllowedDocumentMimeType)
      : null;
  }

  return extensionMimeTypes[getFileExtension(filename)] ?? null;
}

// The whole documents section of the cabinet is translated, so a rejected
// upload must not answer in Russian on an English page.
const MESSAGES = {
  ru: {
    unnamed: "Выберите файл документа с названием.",
    empty: "Выберите непустой файл документа.",
    tooLarge: "Файл документа должен быть не больше 25 МБ.",
    wrongType: "Загрузите файл PDF, PNG, JPG, JPEG или WEBP."
  },
  en: {
    unnamed: "Choose a document file that has a name.",
    empty: "Choose a document file that is not empty.",
    tooLarge: "A document file must be 25 MB or smaller.",
    wrongType: "Upload a PDF, PNG, JPG, JPEG or WEBP file."
  }
} as const satisfies Record<Locale, Record<string, string>>;

export function validateDocumentFile(
  input: {
    name: string;
    size: number;
    type: string;
  },
  locale: Locale = "ru"
): DocumentFileValidationResult {
  const t = MESSAGES[locale];

  if (!input.name.trim()) {
    return { status: "invalid", message: t.unnamed };
  }

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { status: "invalid", message: t.empty };
  }

  if (input.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    return { status: "invalid", message: t.tooLarge };
  }

  const mimeType = resolveAllowedDocumentMimeType(input.name, input.type);

  if (!mimeType) {
    return { status: "invalid", message: t.wrongType };
  }

  return {
    status: "valid",
    mimeType,
    safeFilename: sanitizeOriginalFilename(input.name)
  };
}

export function buildDocumentStoragePath(input: {
  userId: string;
  caseId: string;
  documentId: string;
  originalFilename: string;
}): string {
  return [
    input.userId,
    input.caseId,
    input.documentId,
    sanitizeOriginalFilename(input.originalFilename)
  ].join("/");
}
