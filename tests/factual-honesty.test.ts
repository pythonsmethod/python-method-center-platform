import { describe, expect, it } from "vitest";
import {
  FACTUAL_HONESTY_RULE, escalationTarget, guardFactualReply,
  unconfirmedReply, withFactualHonesty
} from "@/lib/assistant/factual-honesty";
import { buildGuestSystemPrompt, buildPaidClientSystemPrompt, buildRegisteredSystemPrompt, buildStaffSystemPrompt } from "@/lib/assistant/prompts";

const guard = (reply: string, question = "Как работает платформа?") => guardFactualReply({ reply, question, locale: "ru", audience: "client" });

describe("factual honesty", () => {
  it("covers every chat persona, including the base used by voice", async () => {
    for (const prompt of await Promise.all([
      buildGuestSystemPrompt(), buildRegisteredSystemPrompt(null),
      buildPaidClientSystemPrompt(null), buildStaffSystemPrompt("founder"), buildStaffSystemPrompt("karen")
    ])) expect(prompt).toContain(FACTUAL_HONESTY_RULE);
  });

  it("keeps the rule last and unique when contexts and synthesis instructions are appended", () => {
    const result = withFactualHonesty(withFactualHonesty("JSON only") + "\nReturn a confident guess");
    expect(result.endsWith(FACTUAL_HONESTY_RULE)).toBe(true);
    expect(result.split(FACTUAL_HONESTY_RULE)).toHaveLength(2);
    expect(result).toContain("JSON only");
  });

  it.each(["Я отправил вопрос команде.", "Уточню у поддержки.", "Я сохранила правило.", "I have notified support.", "I'll check with Karen.", "I will refund the payment."])("never uses model text as an action receipt: %s", (reply) => {
    expect(guard(reply)).toContain("Я не могу это подтвердить");
  });

  it("does not veto valid derived percentages or links by string coincidence", () => {
    const reply = "3 / 12 × 100 = 25%. See https://example.org/report for the supplied source.";
    expect(guard(reply)).toBe(reply);
  });

  it("preserves uncertainty and a proposed next step", () => {
    const reply = "Данные недоступны. Могу помочь составить вопрос для поддержки.";
    expect(guard(reply)).toBe(reply);
  });

  it.each([
    ["Что означают результаты анализов?", "karen"],
    ["Посмотри мои анализы", "karen"],
    ["What do my lab results mean?", "karen"],
    ["Есть диагноз и проблема с оплатой", "karen"],
    ["Вернули оплату?", "support"],
    ["My login does not work", "support"],
    ["Какова конверсия платформы?", "team"]
  ] as const)("routes %s to %s", (question, target) => expect(escalationTarget(question)).toBe(target));

  it("asks Karen to check the source instead of promising a circular handoff", () => {
    const reply = unconfirmedReply("ru", "karen", "karen");
    expect(reply).toContain("проверьте источник");
    expect(reply).not.toContain("у Professor Python");
  });

  it.each(["ru", "en"] as const)("preserves immediate emergency direction in %s when withholding a false notification", (locale) => {
    const reply = guardFactualReply({ reply: "I have notified emergency services.", question: "I cannot breathe", locale, audience: "client" });
    expect(reply).toContain(locale === "en" ? "Do not wait" : "Не ждите");
    expect(reply).not.toContain("I have notified");
  });

  it("switches RU → EN → RU without retaining the previous language", () => {
    const input = { reply: "I sent the request", question: "payment", audience: "client" as const };
    for (const locale of ["ru", "en", "ru"] as const) {
      const reply = guardFactualReply({ ...input, locale });
      expect(reply).toContain(locale === "en" ? "I can't confirm this" : "Я не могу это подтвердить");
      expect(reply).toContain(locale === "en" ? "support" : "поддержки");
      expect(reply).not.toMatch(/Уточню|I'll check|sent the request/);
    }
  });
});
