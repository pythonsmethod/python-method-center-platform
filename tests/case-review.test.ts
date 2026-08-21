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
  const answer = `${CASE_REVIEW_DRAFT_MARKER}
Аня, посмотрел ваши анализы.

${CASE_REVIEW_SUMMARY_MARKER}
Файл №2, «blood.jpg»: витамин D. Что проверить: цифра размыта.`;

  it("splits the reading from the draft", () => {
    const result = parseCaseReview(answer);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.parts.summary).toContain("Файл №2");
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

  it("rejects an answer without the client-ready section", () => {
    const result = parseCaseReview(
      `${CASE_REVIEW_SUMMARY_MARKER}\nТолько разбор, черновика нет.`
    );
    expect(result.status).toBe("unreadable");
  });

  it("rejects an unmarked answer", () => {
    const result = parseCaseReview("Ассистент ответил без разделителей.");
    expect(result.status).toBe("unreadable");
  });

  it("reports an empty answer instead of storing nothing", () => {
    for (const raw of ["", "   ", `${CASE_REVIEW_DRAFT_MARKER}\n \n${CASE_REVIEW_SUMMARY_MARKER}\n `]) {
      expect(parseCaseReview(raw).status).toBe("unreadable");
    }
  });

  it("turns the no-verification sentinel into an empty verification block", () => {
    const result = parseCaseReview(
      `${CASE_REVIEW_DRAFT_MARKER}\nГотовый текст.\n${CASE_REVIEW_SUMMARY_MARKER}\nНЕТ`
    );
    expect(result.status === "ok" && result.parts.summary).toBe("");
  });

  it("removes a stray long dash from text copied to the client", () => {
    const result = parseCaseReview(
      `${CASE_REVIEW_DRAFT_MARKER}\nПечень — работает без заметной нагрузки.\n${CASE_REVIEW_SUMMARY_MARKER}\nНЕТ`
    );
    expect(result.status === "ok" && result.parts.draft).not.toContain("—");
  });
});

describe("what the prompt requires", () => {
  it("tells the draft not to mention the assistant", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain(
      "Не упоминай ИИ, автоматическое распознавание"
    );
  });

  it("keeps diagnosis and treatment out of the client-facing half", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain(
      "Не ставь диагнозов и не назначай лечение"
    );
  });

  it("requires plain-language names instead of unexplained abbreviations", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain(
      "Не выдавай техническую россыпь"
    );
  });

  it("forbids guessing an unreadable figure", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain("Никогда не угадывай цифру");
  });

  it("forbids long dashes in the client-ready text", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain("Символ «—» в готовом тексте запрещён");
  });

  it("limits holistic conclusions to systems supported by the documents", () => {
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain(
      "только если по ним действительно есть данные"
    );
    expect(CASE_REVIEW_SYSTEM_PROMPT).toContain("Жёсткий максимум 600 слов");
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

  it("shows a separate verification block below the client-ready text", () => {
    const source = readFileSync("components/cases/CaseReviewPanel.tsx", "utf8");

    expect(source.indexOf("review.draft")).toBeLessThan(
      source.indexOf("review.summary")
    );
    expect(source).toContain("Требует проверки");
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

describe("the assistant in the case chat knows about the reading", () => {
  it("is told to wait for automatic reading instead of asking for the files again", async () => {
    const { buildStaffSystemPrompt } = await import("@/lib/assistant/prompts");
    const prompt = await buildStaffSystemPrompt();

    expect(prompt).toContain("Собрать итоговый разбор");
    expect(prompt).toContain(
      "НИКОГДА не проси его прикладывать сюда файлы, которые клиент уже загрузил"
    );
  });

  it("no longer claims it has no access to the case at all", async () => {
    // It does: the case page hands it a snapshot, and the reading of the
    // analyses is part of that snapshot once it exists. Saying otherwise
    // sent Professor Python back to re-uploading files by hand.
    const { buildStaffSystemPrompt } = await import("@/lib/assistant/prompts");
    const prompt = await buildStaffSystemPrompt();

    expect(prompt).not.toContain(
      "У тебя НЕТ прямого доступа к базе данных, кейсам и документам"
    );
  });

  it("leaves the client-facing assistant's boundary untouched", async () => {
    // The client's Анхам still cannot read cabinet storage, and must not
    // learn about a team-only reading of their own analyses.
    const { buildPaidClientSystemPrompt } = await import("@/lib/assistant/prompts");
    const prompt = await buildPaidClientSystemPrompt("контекст");

    expect(prompt).toContain("ХРАНИЛИЩА КАБИНЕТА");
    expect(prompt).not.toContain("Собрать итоговый разбор");
  });
});
