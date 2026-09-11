import { describe, expect, it } from "vitest";
import {
  CLIENT_PAYMENT_VISIBILITY_RULE,
  buildGuestSystemPrompt,
  buildPaidClientSystemPrompt,
  buildRegisteredSystemPrompt
} from "@/lib/assistant/prompts";

// The wording a person actually reads when they ask about their own money.
// Each sentence checked here is the honest version of a mistake: a guessed
// activation date, "I see your payment" with nothing behind it, or silence
// about a read failure dressed up as "you have not paid".
describe("what the signed-in assistant is told about payments", () => {
  it("reaches both signed-in levels and stays off the public page", async () => {
    expect(await buildRegisteredSystemPrompt(null)).toContain(CLIENT_PAYMENT_VISIBILITY_RULE);
    expect(await buildPaidClientSystemPrompt(null)).toContain(CLIENT_PAYMENT_VISIBILITY_RULE);
    expect(await buildGuestSystemPrompt()).not.toContain(CLIENT_PAYMENT_VISIBILITY_RULE);
  });

  it("names every status the system records, in both languages", () => {
    for (const status of ["paid", "pending", "failed", "refunded", "partially_refunded"]) {
      expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain(status);
    }
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("платёж зафиксирован системой");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("recorded by the system");
  });

  it("allows only recorded dates and forbids arriving at one by arithmetic", () => {
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Период сопровождения начинается 1 сентября 2026 года и заканчивается 6 октября 2026 года");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Никогда не вычисляй, не продлевай и не угадывай дату окончания");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("never calculate, extend or guess an end date");
  });

  it("separates a payment status from an opened support period", () => {
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Статус платежа сам по себе НЕ означает, что период сопровождения начался");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("A payment status never establishes an active support period by itself");
  });

  it("carries the exact RU and EN wording for a payment without a period", () => {
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Платёж зафиксирован, но отдельная запись о периоде сопровождения пока не найдена. Я не буду придумывать дату активации. Обратитесь в поддержку через /support, чтобы команда проверила связку платежа и доступа");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("The payment is recorded, but I cannot find a separate service-period record yet. I won’t invent an activation date. Please contact support through /support so the team can check the payment and access link.");
  });

  it("carries the exact RU and EN wording when no payment is recorded", () => {
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Я не вижу подтверждённой записи об оплате в доступных данных. Напишите в службу поддержки через /support и укажите дату, сумму и способ оплаты. Полные реквизиты карты отправлять не нужно");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("I do not see a confirmed payment record in the data available to me. Please contact support through /support with the payment date, amount and method. Do not send full card details.");
  });

  it("keeps a read failure from becoming a missing payment", () => {
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Это НЕ отсутствие оплаты");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Unavailable is not absent");
    // Both dead ends route to the same human channel.
    expect(CLIENT_PAYMENT_VISIBILITY_RULE.match(/\/support/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("forbids processor references and card details on both sides of the answer", () => {
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Never name, request or confirm a processor reference, transaction id, card or bank details");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("реквизиты карты");
  });

  it("keeps other people's records out of scope", () => {
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("Записи других людей тебе не передаются");
    expect(CLIENT_PAYMENT_VISIBILITY_RULE).toContain("records of other people are never available to you");
  });

  it("never reveals the machinery answering the question", async () => {
    for (const prompt of [await buildRegisteredSystemPrompt(null), await buildPaidClientSystemPrompt(null)]) {
      expect(prompt).not.toMatch(/claude|gpt|openai|anthropic/i);
      expect(prompt).not.toMatch(/две модели|третья выбирает|арбитр/i);
    }
  });
});
