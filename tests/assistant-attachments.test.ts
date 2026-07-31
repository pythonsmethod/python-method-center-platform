import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENTS,
  sanitizeAttachments
} from "@/lib/assistant/attachments";

function base64Of(size: number): string {
  return Buffer.alloc(size, 1).toString("base64");
}

const photo = {
  name: "analysis.jpg",
  mediaType: "image/jpeg",
  data: base64Of(1024)
};

describe("assistant attachments", () => {
  it("treats a missing field as no attachments", () => {
    expect(sanitizeAttachments(undefined)).toBeNull();
    expect(sanitizeAttachments(null)).toBeNull();
  });

  it("accepts photos, PDFs and text files", () => {
    const result = sanitizeAttachments([
      photo,
      { name: "report.pdf", mediaType: "application/pdf", data: base64Of(2048) },
      { name: "notes.txt", mediaType: "text/plain", data: base64Of(64) }
    ]);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(3);
  });

  it("refuses file types the models cannot read", () => {
    expect(
      sanitizeAttachments([
        { name: "scan.dcm", mediaType: "application/dicom", data: base64Of(64) }
      ])
    ).toBe("invalid");
  });

  it("refuses more files than allowed at once", () => {
    const many = Array.from({ length: MAX_ATTACHMENTS + 1 }, () => photo);

    expect(sanitizeAttachments(many)).toBe("invalid");
  });

  it("refuses a file over the size limit", () => {
    expect(
      sanitizeAttachments([
        { ...photo, data: base64Of(2_600_000) }
      ])
    ).toBe("invalid");
  });

  it("refuses a set that is small per file but too large together", () => {
    const chunk = { ...photo, data: base64Of(1_800_000) };

    expect(sanitizeAttachments([chunk, chunk])).toBe("invalid");
  });

  it("refuses payloads that are not base64", () => {
    expect(
      sanitizeAttachments([{ ...photo, data: "not base64!!" }])
    ).toBe("invalid");
  });

  it("refuses an empty list rather than treating it as no attachments", () => {
    expect(sanitizeAttachments([])).toBe("invalid");
  });
});
