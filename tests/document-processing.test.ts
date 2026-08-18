import { describe, expect, it } from "vitest";
import { buildDocumentReuploadMessage } from "@/lib/documents/processing";

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
