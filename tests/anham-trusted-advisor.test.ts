import { describe, expect, it } from "vitest";
import {
  buildGuestSystemPrompt,
  buildPaidClientSystemPrompt,
  buildRegisteredSystemPrompt
} from "@/lib/assistant/prompts";

describe("Anham trusted commercial advice", () => {
  it.each([
    ["guest", () => buildGuestSystemPrompt()],
    ["registered", () => buildRegisteredSystemPrompt(null)],
    ["client", () => buildPaidClientSystemPrompt(null)]
  ])("gives the %s tier a needs-based recommendation flow", async (_tier, build) => {
    const prompt = await build();

    expect(prompt).toContain("дай ОДНУ основную рекомендацию");
    expect(prompt).toContain("почему он соответствует именно названной потребности");
    expect(prompt).toContain("Заверши одним ясным следующим шагом");
  });

  it("uses truthful persuasion rather than pressure", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("Не используй искусственный дефицит");
    expect(prompt).toContain("Если более простой или бесплатный шаг разумнее");
    expect(prompt).toContain("не предлагай купить всё сразу");
  });

  it("prioritizes paid support and routes by purchase readiness", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("Главный продукт центра — платное сопровождение");
    expect(prompt).toContain("Готов начать или прямо выбирает тариф");
    expect(prompt).toContain("веди на /payment");
    expect(prompt).toContain("Не уводи готового человека сначала на бесплатную оценку");
  });

  it("recommends either plan using transparent fit and total price", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("«5 недель» рекомендуй");
    expect(prompt).toContain("итог $1440");
    expect(prompt).toContain("«100 дней» рекомендуй");
    expect(prompt).toContain("итог $3675");
    expect(prompt).toContain("полную итоговую стоимость без скрытия сборов");
  });

  it("does not sell unavailable catalogue products", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("ещё нельзя купить");
    expect(prompt).toContain("предлагай лист ожидания");
    expect(prompt).toContain("не выдавай за отдельно доступный товар");
  });

  it("requires fully localized Russian and English answers", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("Отвечай полностью на языке собеседника");
    expect(prompt).toContain("не смешивай языки интерфейса");
  });

  it.each([
    ["guest", () => buildGuestSystemPrompt()],
    ["registered", () => buildRegisteredSystemPrompt(null)],
    ["client", () => buildPaidClientSystemPrompt(null)]
  ])("promotes the website and mobile app at the %s tier", async (_tier, build) => {
    const prompt = await build();

    expect(prompt).toContain("Сайт и мобильное приложение — единый путь клиента");
    expect(prompt).toContain("Самое интересное ещё впереди");
    expect(prompt).toContain("установить приложение на телефон");
    expect(prompt).toContain("ежедневная сводка и персональные напоминания");
  });

  it("does not pretend the coming-soon app is already downloadable", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("Приложение ещё готовится к выпуску");
    expect(prompt).toContain("Никогда не говори, что приложение уже можно скачать");
    expect(prompt).toContain("пользоваться сайтом уже сейчас");
  });

  it.each([
    ["guest", () => buildGuestSystemPrompt()],
    ["registered", () => buildRegisteredSystemPrompt(null)],
    ["client", () => buildPaidClientSystemPrompt(null)]
  ])("builds factual trust in Karen at the %s tier", async (_tier, build) => {
    const prompt = await build();

    expect(prompt).toContain("Карен — это тот же живой человек");
    expect(prompt).toContain("ключевые решения по кейсу принимает лично Карен");
    expect(prompt).toContain("защищённом кабинете");
    expect(prompt).toContain("не подменяет машинным мнением");
  });

  it("turns trust into an appropriate service or product step", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("Как переводить доверие в интерес к услугам и продукции");
    expect(prompt).toContain("порекомендуй подходящий тариф сопровождения");
    expect(prompt).toContain("личное мнение Карена без обязательства");
    expect(prompt).toContain("как подарок в обоих тарифах");
  });

  it("forbids invented credentials and blind health trust", async () => {
    const prompt = await buildGuestSystemPrompt();

    expect(prompt).toContain("Не называй его врачом");
    expect(prompt).toContain("Не проси слепо «доверить здоровье»");
    expect(prompt).toContain("если факта нет — честно скажи это");
  });
});
