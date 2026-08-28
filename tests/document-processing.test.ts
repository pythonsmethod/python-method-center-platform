import { describe, expect, it } from "vitest";
import { buildDocumentReuploadMessage } from "@/lib/documents/processing";
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  validateDocumentFile
} from "@/lib/documents/config";

describe("document processing client notification", () => {
  it("names only the failed file in Russian and preserves the others", () => {
    const message = buildDocumentReuploadMessage("ru", "МРТ.pdf");
    expect(message).toContain("«МРТ.pdf»");
    expect(message).toContain("именно этот файл");
    expect(message).toContain("Остальные документы сохранены");
  });

  it("provides the same complete guidance in English", () => {
    const message = buildDocumentReuploadMessage("en", "MRI.pdf");
    expect(message).toContain("“MRI.pdf”");
    expect(message).toContain("upload this file again");
    expect(message).toContain("other documents remain safely attached");
  });
});

// The documents section of the cabinet is fully translated, so a rejected
// upload must answer in the language the person is reading. The validator
// used to hold four Russian sentences with no way to ask for anything else,
// and both callers — the panel and the server action — printed them
// verbatim on the English page.
describe("upload rejection speaks the reader's language", () => {
  const tooBig = {
    name: "analysis.pdf",
    size: MAX_DOCUMENT_FILE_SIZE_BYTES + 1,
    type: "application/pdf"
  };
  const wrongType = { name: "notes.docx", size: 2048, type: "application/msword" };
  const cyrillic = /[А-Яа-яЁё]/;

  it("answers in Russian by default", () => {
    const result = validateDocumentFile(tooBig);

    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" && cyrillic.test(result.message)).toBe(true);
  });

  it("answers in English when the reader is on the English site", () => {
    for (const input of [tooBig, wrongType, { name: " ", size: 1, type: "" }]) {
      const result = validateDocumentFile(input, "en");

      expect(result.status).toBe("invalid");
      expect(result.status === "invalid" && cyrillic.test(result.message)).toBe(false);
    }
  });

  it("still accepts a valid file in either language", () => {
    const good = { name: "scan.png", size: 1024, type: "image/png" };

    expect(validateDocumentFile(good, "en").status).toBe("valid");
    expect(validateDocumentFile(good, "ru").status).toBe("valid");
  });
});
