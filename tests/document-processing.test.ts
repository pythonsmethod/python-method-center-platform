import { describe, expect, it } from "vitest";
import {
  buildDocumentReuploadMessage,
  buildDocumentServiceFailureMessage
} from "@/lib/documents/processing";
import { clientDocumentStatusLabel } from "@/lib/i18n/status-labels";
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

// A file can also fail for a reason that has nothing to do with the file —
// a provider outage, a timeout. Nothing used to be said in that case: only
// the unreadable ending wrote to the client. The cabinet now shows just "in
// progress" and "ready", so the message is the only place a person learns
// that a document is not coming back.
describe("a service failure is explained to the client", () => {
  it("does not ask for a new upload, because the file was fine", () => {
    for (const locale of ["ru", "en"] as const) {
      const message = buildDocumentServiceFailureMessage(locale, "MRI.pdf");

      expect(message).toContain("MRI.pdf");
      expect(message.length).toBeGreaterThan(60);
    }
  });

  it("says the fault is ours in both languages", () => {
    expect(buildDocumentServiceFailureMessage("ru", "анализ.pdf")).toContain(
      "на нашей стороне"
    );
    expect(buildDocumentServiceFailureMessage("en", "test.pdf")).toContain(
      "on our side"
    );
  });
});

// The team reads the queue's own vocabulary; the client reads whether their
// document is being worked on or done. Both used to see the team's list,
// which mixes two database lifecycles and offers "Обработан" and "Принят"
// as if they were different things.
describe("document status as the client reads it", () => {
  it("collapses every in-flight state into one", () => {
    for (const status of ["uploaded", "queued", "processing"]) {
      expect(clientDocumentStatusLabel(status, "ru")).toBe("В работе");
      expect(clientDocumentStatusLabel(status, "en")).toBe("In progress");
    }
  });

  it("names the finished and the failed states plainly", () => {
    expect(clientDocumentStatusLabel("ready", "en")).toBe("Ready");
    expect(clientDocumentStatusLabel("needs_reupload", "en")).toBe("Needs a new file");
    expect(clientDocumentStatusLabel("failed", "en")).toBe("Needs a new file");
    expect(clientDocumentStatusLabel("archived", "ru")).toBe("В архиве");
  });

  it("never shows an unknown state as done", () => {
    expect(clientDocumentStatusLabel("some_future_status", "ru")).toBe("В работе");
  });
});
