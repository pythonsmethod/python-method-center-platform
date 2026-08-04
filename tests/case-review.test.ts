import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CASE_REVIEW_DRAFT_MARKER,
  CASE_REVIEW_SUMMARY_MARKER,
  CASE_REVIEW_SYSTEM_PROMPT,
  parseCaseReview
} from "@/lib/assistant/case-review";
import { fingerprintDocuments, isReadableType } from "@/lib/cases/case-documents";

// The assistant reads a case's own analyses and produces two things for
// two different readers. The tests here hold the line between them.
//
// The summary is for Professor Python and may interpret — he is the expert
// and hedging at him is useless. The draft is a proposed reply that he
// copies, edits and sends under his own name. Nothing sends it for him,
// and nothing may ever start to.

describe("the two halves of the answer", () => {
  const answer = `${CASE_REVIEW_SUMMARY_MARKER}
Ферритин 18 нг/мл (реф. 30–150), 01.08.2026 — читается уверенно.
Витамин D — снимок смазан, цифру не беру.

${CASE_REVIEW_DRAFT_MARKER}
Аня, посмотрел ваши анализы.`;

  it("splits the reading from the draft", () => {
    const result = parseCaseReview(answer);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.parts.summary).toContain("Ферритин 18");
    expect(result.parts.summary).not.toContain("Аня, посмотрел");
    expect(result.parts.draft).toBe("Аня, посмотрел ваши анализы.");
  });

  it("keeps neither marker in the text shown to anyone", () => {
    const result = parseCaseReview(answer);
    if (result.status !== "ok") throw new Error("expected ok");

    for (const half of [result.parts.summary, result.parts.draft]) {
      expect(half).not.toContain(CASE_REVIEW_SUMMARY_MARKER);
      expect(half).not.toContain(CASE_REVIEW_DRAFT_MARKER);
    }
  });

  it("leaves the draft empty rather than improvising one", () => {
    // If the model loses the second marker, everything becomes the reading
    // for Professor Python. The half addressed to a client is the one that
    // must never be assembled out of guesswork.
    const result = parseCaseReview(
      `${CASE_REVIEW_SUMMARY_MARKER}\nТолько разбор, черновика нет.`
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.parts.summary).toBe("Только разбор, черновика нет.");
    expect(result.parts.draft).toBe("");
  });

  it("takes an unmarked answer as the reading, not as a reply", () => {
    const result = parseCaseReview("Ассистент ответил без разделителей.");

    expect(result.status === "ok" && result.parts.draft).toBe("");
    expect(result.status === "ok" && result.parts.summary).toContain(
      "без разделителей"
    );
  });

  it("reports an empty answer instead of storing nothing", () => {
    for (const raw of ["", "   ", `${CASE_REVIEW_SUMMARY_MARKER}\n \n${CASE_REVIEW_DRAFT_MARKER}\n `]) {
      expect(parseCaseReview(raw).status).toBe("unreadable");
    }
  });
});

describe("what the prompt requires", () => {
  it("tells the draft not to mention the assistant", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain(
      "Не упоминай ИИ, ассистента, платформу"
    );
  });

  it("keeps diagnosis and treatment out of the client-facing half", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain(
      "Не ставь диагнозов и не назначай лечение"
    );
  });

  it("keeps the paid boundary in the draft", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain(
      "полный разбор с рекомендациями входит в платные форматы"
    );
  });

  it("forbids guessing an unreadable figure", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain("Никогда не угадывай цифру");
  });
});

describe("nothing sends the draft", () => {
  it("the action that makes it never writes a message to the client", () => {
    // The one guarantee that makes this legitimate: a client is told a
    // person read their analyses, and a person did — Professor Python
    // copies the draft, changes it and sends it himself. If this file ever
    // starts writing to case_messages, that guarantee is gone.
    const source = readFileSync("lib/cases/review-actions.ts", "utf8");

    expect(source).not.toContain("case_messages");
    expect(source).not.toContain("sendStaffCaseMessage");
  });

  it("the panel offers copying, not sending", () => {
    const source = readFileSync("components/cases/CaseReviewPanel.tsx", "utf8");

    expect(source).toContain("clipboard");
    expect(source).not.toContain("sendStaffCaseMessage");
  });

  it("says on screen that the reading is the machine's, not his", () => {
    const source = readFileSync("components/cases/CaseReviewPanel.tsx", "utf8");

    expect(source).toContain("Это мнение ИИ, а не разбор Professor Python");
  });
});

describe("which files can be read", () => {
  it("takes photographs, PDFs and plain text", () => {
    for (const type of ["image/jpeg", "image/png", "application/pdf", "text/plain"]) {
      expect(isReadableType(type)).toBe(true);
    }
  });

  it("leaves alone what the model cannot open", () => {
    for (const type of ["application/zip", "application/msword", "video/mp4"]) {
      expect(isReadableType(type)).toBe(false);
    }
  });
});

describe("knowing when a reading is out of date", () => {
  const docs = [
    { id: "b", created_at: "2026-08-02T10:00:00Z" },
    { id: "a", created_at: "2026-08-01T10:00:00Z" }
  ];

  it("does not depend on the order the documents come back in", () => {
    expect(fingerprintDocuments(docs)).toBe(
      fingerprintDocuments([...docs].reverse())
    );
  });

  it("changes when the client uploads something new", () => {
    expect(
      fingerprintDocuments([...docs, { id: "c", created_at: "2026-08-03T10:00:00Z" }])
    ).not.toBe(fingerprintDocuments(docs));
  });

  it("changes when a document is removed", () => {
    expect(fingerprintDocuments([docs[0]])).not.toBe(fingerprintDocuments(docs));
  });
});
