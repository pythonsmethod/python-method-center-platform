import { describe, expect, it } from "vitest";
import {
  GAP_TOPICS,
  classifyGapTopic,
  detectKnowledgeGap,
  isGuardEscalationReply,
  isKnowledgeGapReply
} from "@/lib/assistant/escalation";
import { unconfirmedReply } from "@/lib/assistant/factual-honesty";
import { gapDraftSeed } from "@/lib/assistant/escalation-copy";

// The founder must learn that a subject went unanswered. Nobody may learn
// what was asked. These tests hold that line at the only place the question
// is ever read.

describe("knowledge gap detection", () => {
  it("fires on the honesty guard's own substituted reply", () => {
    for (const target of ["karen", "support", "team"] as const) {
      for (const locale of ["ru", "en"] as const) {
        expect(isGuardEscalationReply(unconfirmedReply(locale, target, "client"))).toBe(true);
      }
    }
  });

  it("fires on a provider's natural factual refusal", () => {
    const replies = [
      "I won't reply with that sentence, because it isn't true. This chat can't submit refund requests, and I have no confirmed system result showing that any refund request was sent.",
      "I won't reply with that sentence, because it isn't true. This chat has no refund tool, and there's no confirmed system result showing that one was sent.",
      "I have no confirmation that the refund was completed.",
      "Я не могу утверждать, что возврат выполнен. В доступном контексте нет подтверждения."
    ];

    for (const reply of replies) {
      expect(isKnowledgeGapReply(reply)).toBe(true);
      expect(
        detectKnowledgeGap({ reply, question: "Когда вернут оплату?", audience: "staff", locale: "ru" })
      ).toMatchObject({ topic: "payment_or_refund", audience: "staff", escalationTarget: "support" });
    }
  });

  it("does not fire on an ordinary model answer that merely sounds unsure", () => {
    const answers = [
      "Я не уверен, но, кажется, сопровождение длится пять недель.",
      "I'm not sure, but support usually lasts five weeks.",
      "Не могу сказать точно — уточните, пожалуйста, вопрос."
    ];

    for (const reply of answers) {
      expect(isGuardEscalationReply(reply)).toBe(false);
      expect(isKnowledgeGapReply(reply)).toBe(false);
      expect(
        detectKnowledgeGap({ reply, question: "Сколько стоит сопровождение?", audience: "client", locale: "ru" })
      ).toBeNull();
    }
  });

  it("treats a clarifying question as conversation, not as a gap", () => {
    const reply = unconfirmedReply("ru", "clarify", "client");

    expect(isGuardEscalationReply(reply)).toBe(true);
    expect(
      detectKnowledgeGap({ reply, question: "А что там по этому поводу?", audience: "client", locale: "ru" })
    ).toBeNull();
  });

  it("returns enumerated values only — never the question", () => {
    const question = "Мой анализ крови показал ферритин 8, у меня постоянная слабость. Что делать?";
    const signal = detectKnowledgeGap({
      reply: unconfirmedReply("ru", "karen", "client"),
      question,
      audience: "client",
      locale: "ru"
    });

    expect(signal).not.toBeNull();
    expect(Object.keys(signal!).sort()).toEqual([
      "audience",
      "escalationTarget",
      "locale",
      "topic"
    ]);
    expect(GAP_TOPICS).toContain(signal!.topic);
    expect(signal!.topic).toBe("medical_review");

    // The decisive assertion: nothing the person wrote survives the signal.
    const serialized = JSON.stringify(signal);
    for (const fragment of ["ферритин", "8", "слабость", "анализ", "крови"]) {
      expect(serialized).not.toContain(fragment);
    }
  });

  it("classifies both languages into the same enumerated subjects", () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["Когда вернутся деньги за отменённую оплату?", "payment_or_refund"],
      ["How much does the 100-day support cost?", "pricing_and_plans"],
      ["Не могу войти в кабинет, пароль не подходит", "access_or_account"],
      ["I cannot upload my PDF document", "documents_and_uploads"],
      ["Сколько ждать ответа после отправки анкеты?", "schedule_and_timing"],
      ["How does your method actually work?", "methodology"],
      ["Что вообще делает ваш центр?", "service_scope"],
      ["My blood test shows a high marker", "medical_review"]
    ];

    for (const [question, expected] of cases) {
      expect(classifyGapTopic(question)).toBe(expected);
    }
  });

  it("falls back to unclassified rather than guessing", () => {
    expect(classifyGapTopic("")).toBe("unclassified");
    expect(classifyGapTopic("   ")).toBe("unclassified");
    expect(classifyGapTopic("ыва фыва")).toBe("unclassified");
  });

  it("opens a bilingual draft that carries no conversation content", () => {
    for (const topic of GAP_TOPICS) {
      const seed = gapDraftSeed(topic);

      expect(seed.title).toMatch(/Пробел знаний:/);
      expect(seed.title).toMatch(/Knowledge gap:/);
      expect(seed.content).toMatch(/[А-Яа-яЁё]/);
      expect(seed.content).toMatch(/[A-Za-z]/);
      // The title is also the deduplication key and must not depend on which
      // language the founder happened to be reading.
      expect(seed.title).toBe(gapDraftSeed(topic).title);
    }
  });
});
