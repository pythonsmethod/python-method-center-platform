import {
  IMAGE_MAX_DIMENSION,
  IMAGE_QUALITY,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENT_BYTES,
  PDF_TYPE,
  isTextType
} from "@/lib/assistant/attachments";

// Browser-side preparation of attached files.
//
// A person photographing their analyses sends whatever the phone produced:
// five-megabyte HEIC files, thirty of them. The model needs none of that
// weight to read a lab printout, and no request would carry it anyway. So
// photos are downscaled and re-encoded as JPEG here, before anything
// leaves the browser.

export type PreparedFile = {
  id: string;
  name: string;
  mediaType: string;
  data: string;
  bytes: number;
};

function base64Bytes(data: string): number {
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;

  return Math.floor((data.length * 3) / 4) - padding;
}

function stripPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");

  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function readAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File): Promise<{ data: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("no-canvas");
  }

  // White background: scans and printouts often come with transparency,
  // and black-on-black would be unreadable after flattening to JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let outputCanvas = canvas;
  let quality = IMAGE_QUALITY;
  let data = stripPrefix(outputCanvas.toDataURL("image/jpeg", quality));

  // Keep the sharp copy whenever it fits. Degrade only an individual image
  // that would otherwise be rejected by the API size limit.
  while (base64Bytes(data) > MAX_ATTACHMENT_BYTES && quality > 0.7) {
    quality = Math.max(0.7, quality - 0.05);
    data = stripPrefix(outputCanvas.toDataURL("image/jpeg", quality));
  }

  // A very noisy photo may still be too large as JPEG. Step the dimensions
  // down only as far as necessary instead of rejecting the analysis.
  while (
    base64Bytes(data) > MAX_ATTACHMENT_BYTES &&
    Math.max(outputCanvas.width, outputCanvas.height) > 1600
  ) {
    const resized = document.createElement("canvas");
    resized.width = Math.max(1, Math.round(outputCanvas.width * 0.85));
    resized.height = Math.max(1, Math.round(outputCanvas.height * 0.85));
    const resizedContext = resized.getContext("2d");
    if (!resizedContext) break;
    resizedContext.fillStyle = "#ffffff";
    resizedContext.fillRect(0, 0, resized.width, resized.height);
    resizedContext.drawImage(outputCanvas, 0, 0, resized.width, resized.height);
    outputCanvas = resized;
    quality = Math.max(0.78, quality);
    data = stripPrefix(outputCanvas.toDataURL("image/jpeg", quality));
  }

  return { data, mediaType: "image/jpeg" };
}

export type PrepareResult = {
  files: PreparedFile[];
  errors: string[];
};

// Converts picked files into what the API accepts. Never throws on one bad
// file: the rest still go through, and the person is told what was skipped.
export async function prepareFiles(
  selected: File[],
  startIndex: number
): Promise<PrepareResult> {
  const files: PreparedFile[] = [];
  const errors: string[] = [];

  for (const [offset, file] of selected.entries()) {
    try {
      if (file.type.startsWith("image/")) {
        const compressed = await compressImage(file);
        const bytes = base64Bytes(compressed.data);

        if (bytes > MAX_ATTACHMENT_BYTES) {
          errors.push(`«${file.name}» слишком большой даже после сжатия.`);
          continue;
        }

        files.push({
          id: `${startIndex + offset}-${file.name}`,
          // Photos keep a readable name after conversion.
          name: file.name.replace(/\.(heic|heif|png|webp|gif)$/i, ".jpg"),
          mediaType: compressed.mediaType,
          data: compressed.data,
          bytes
        });
        continue;
      }

      if (file.type === PDF_TYPE || isTextType(file.type)) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          errors.push(`«${file.name}» больше 2,5 МБ — уменьшите файл.`);
          continue;
        }

        const data = stripPrefix(await readAsDataUrl(file));

        files.push({
          id: `${startIndex + offset}-${file.name}`,
          name: file.name,
          mediaType: file.type,
          data,
          bytes: base64Bytes(data)
        });
        continue;
      }

      errors.push(`«${file.name}»: такой тип файла не поддерживается.`);
    } catch {
      errors.push(`Не удалось прочитать «${file.name}».`);
    }
  }

  return { files, errors };
}

// Splits the attachments into requests that fit: no more files and no more
// bytes than one request can carry.
export function splitIntoBatches(files: PreparedFile[]): PreparedFile[][] {
  const batches: PreparedFile[][] = [];
  let current: PreparedFile[] = [];
  let currentBytes = 0;

  for (const file of files) {
    const wouldExceed =
      current.length >= MAX_ATTACHMENTS ||
      currentBytes + file.bytes > MAX_TOTAL_ATTACHMENT_BYTES;

    if (wouldExceed && current.length > 0) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }

    current.push(file);
    currentBytes += file.bytes;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}
