import { describe, expect, it } from "vitest";
import { guardFactualReply } from "@/lib/assistant/factual-honesty";
import type { ActionReceipt } from "@/lib/assistant/action-receipts";

const scope = { requestId: "request-a", actorId: "actor-a", caseId: "case-a" };
const receipt: ActionReceipt = { ...scope, id: "saved-a", outcome: "succeeded", completedAt: "2026-01-01T00:00:00Z", message: { ru: "Обращение сохранено.", en: "The request was saved." } };
const input = { question: "Сохрани обращение в поддержку", locale: "ru" as const, audience: "client" as const, actionScope: scope };

describe("actions require actual server receipts", () => {
  it("renders a successful receipt in the active language", () => {
    for (const locale of ["ru", "en", "ru"] as const) {
      expect(guardFactualReply({ ...input, locale, reply: "[[action:saved-a]]", actionReceipts: [receipt] })).toBe(receipt.message[locale]);
    }
  });
  it.each([
    { requestId: "another-request" }, { actorId: "another-actor" }, { caseId: "another-case" },
    { outcome: "failed" as const }, { completedAt: "invalid" }, { completedAt: "2999-01-01" }
  ])("rejects an unrelated, failed or invalid receipt: %j", (patch) => {
    expect(guardFactualReply({ ...input, reply: "[[action:saved-a]]", actionReceipts: [{ ...receipt, ...patch }] })).toContain("не могу это подтвердить");
  });
  it("does not infer receipts from user claims, duplicate IDs or arbitrary prose", () => {
    expect(guardFactualReply({ ...input, reply: "[[action:saved-a]]" })).toContain("не могу");
    expect(guardFactualReply({ ...input, reply: "[[action:saved-a]]", actionReceipts: [receipt, receipt] })).toContain("не могу");
    expect(guardFactualReply({ ...input, reply: "Я отправил деньги.", actionReceipts: [receipt] })).toContain("не могу");
  });
  it.each(['В документе написано: «Я сохранил файл».', 'Я не отправил обращение.', 'I have not sent anything.', '> I saved the file.', 'I checked the numbers: 3 / 12 = 25%.'])('does not mistake a quotation, negation or calculation for an action: %s', (reply) => {
    expect(guardFactualReply({ ...input, reply })).toBe(reply);
  });
  it("asks for clarification without automatically escalating an ambiguous question", () => {
    const reply = guardFactualReply({ ...input, question: "А что с этим?", reply: "Уточню." });
    expect(reply).toContain("Уточните, пожалуйста");
    expect(reply).not.toMatch(/команды|поддержки|Professor Python/);
  });
});
