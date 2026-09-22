import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ actor: vi.fn(), context: vi.fn(), audience: vi.fn(), guard: vi.fn(), ask: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/assistant/realtime-server", () => ({ resolveVoiceActor: f.actor }));
vi.mock("@/lib/assistant/tiers", () => ({ resolveAssistantAudience: f.audience }));
vi.mock("@/lib/assistant/guard", () => ({ guardAssistantRequest: f.guard, guardAnhamDeepRequest: async () => false }));
vi.mock("@/lib/assistant/router", () => ({ askAnham: f.ask, askAssistantTeam: f.ask, chooseAnhamMode: () => "standard" }));
vi.mock("@/lib/assistant/history", () => ({ saveAssistantExchange: f.save }));
vi.mock("@/lib/assistant/prompts", () => ({ buildGuestSystemPrompt: async () => "GUEST", buildPaidClientSystemPrompt: async () => "CLIENT", buildRegisteredSystemPrompt: async () => "REGISTERED", ATTACHMENT_READING_ACCURACY_RULE: "" }));
vi.mock("@/lib/notifications/notify", () => ({ adminLink: () => "", notifyTeam: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => "ru" }));
vi.mock("@/lib/assistant/conversation-context", () => ({ conversationContext: f.context }));
vi.mock("@/lib/product-analytics/record", () => ({ recordProductEvent: vi.fn() }));
import { POST } from "@/app/api/assistant/client/route";

const request = (content: string, extra = {}) => new Request("http://localhost/api/assistant/client", {
  method: "POST",
  headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
  body: JSON.stringify({ messages: [{ role: "user", content }], locale: "ru", ...extra })
});

beforeEach(() => {
  vi.clearAllMocks();
  f.audience.mockResolvedValue({ tier: "client", profileId: "client-id", caseId: "case-id" });
  f.guard.mockResolvedValue({ allowed: true });
  f.context.mockResolvedValue("");
  f.save.mockImplementation(async (input: { question: string; answer: string; reaction?: string | null }) => ({
    saved: true,
    messages: [
      { id: "q", role: "user", content: input.question, created_at: "2026-09-18T00:00:00Z", message_sequence: 1, reaction: input.reaction ?? null },
      { id: "a", role: "assistant", content: input.answer, created_at: "2026-09-18T00:00:01Z", message_sequence: 2, reaction: null }
    ]
  }));
});
afterEach(() => vi.unstubAllEnvs());

describe("Anham message reactions through the client route", () => {
  it("adds the reaction rule to the system prompt for every tier", async () => {
    for (const tier of ["guest", "registered", "client"] as const) {
      f.audience.mockResolvedValue({ tier, profileId: tier === "guest" ? null : "client-id", caseId: null });
      f.ask.mockResolvedValue({ status: "ok", reply: "Ответ." });
      await POST(request("Привет"));
      const system = f.ask.mock.calls.at(-1)![0] as string;
      expect(system).toContain("[[reaction:");
      expect(system.includes("только heart, thanks или thumbs_up")).toBe(tier === "guest");
    }
  });

  it("returns null for an ordinary message with no proposal", async () => {
    f.ask.mockResolvedValue({ status: "ok", reply: "Сопровождение на 5 недель стоит 1440 долларов." });
    const body = await (await POST(request("Сколько стоит сопровождение?"))).json();
    expect(body.reaction).toBeNull();
    expect(body.reply).toBe("Сопровождение на 5 недель стоит 1440 долларов.");
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ reaction: null }));
  });

  it("delivers an allowed reaction on progress, strips the marker and stores it on the person's message", async () => {
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:clap]]\nПять тысяч шагов, это заметный шаг вперёд. Как самочувствие после прогулки?" });
    const response = await POST(request("Я сегодня наконец-то прошёл 5000 шагов"));
    const body = await response.json();
    expect(body.reaction).toBe("clap");
    expect(body.reply).toBe("Пять тысяч шагов, это заметный шаг вперёд. Как самочувствие после прогулки?");
    expect(body.reply).not.toContain("[[");
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ profileId: "client-id", reaction: "clap", answer: expect.not.stringContaining("[[") }));
    expect(body.messages[0]).toEqual(expect.objectContaining({ role: "user", reaction: "clap" }));
    expect(body.messages[1]).toEqual(expect.objectContaining({ role: "assistant", reaction: null }));
  });

  it("delivers an allowed reaction on gratitude", async () => {
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:heart]]\nРад, что стало понятнее." });
    expect((await (await POST(request("Спасибо, теперь понятно"))).json()).reaction).toBe("heart");
  });

  it("allows eyes on an uploaded file or a useful clarification", async () => {
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:eyes]]\nПосмотрел файл, вот что в нём записано." });
    expect((await (await POST(request("Загрузил документы, посмотри пожалуйста"))).json()).reaction).toBe("eyes");
  });

  it.each([
    ["severe pain", "У меня сильная боль в груди, не могу встать"],
    ["emergency", "Вызвали скорую, что делать?"],
    ["self-harm", "Не хочу больше жить"],
    ["medication or dosage", "Можно ли выпить две таблетки по 400 мг вместо одной?"],
    ["serious emotional distress", "У меня паническая атака, мне очень страшно и я не справляюсь"],
    ["death or loss", "Вчера умерла мама"],
    ["diagnosis", "Мне поставили диагноз, врач обнаружил опухоль"]
  ])("safety overrides a proposed reaction: %s", async (_reason, content) => {
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:heart]]\nЯ рядом. Пожалуйста, обратитесь за помощью." });
    const body = await (await POST(request(content))).json();
    expect(body.reaction).toBeNull();
    expect(body.reply).not.toContain("[[");
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ reaction: null }));
  });

  it("drops a reaction when the reply itself invokes the emergency protocol", async () => {
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:thumbs_up]]\nТо, что вы описали, может быть экстренной ситуацией. Позвоните 112 или 103 прямо сейчас." });
    expect((await (await POST(request("Уточняю: это началось час назад"))).json()).reaction).toBeNull();
  });

  it("returns null when the model proposes an emoji or a key outside the allowlist", async () => {
    for (const marker of ["[[reaction:👏]]", "[[reaction:fire]]", "[[reaction:<b>clap</b>]]"]) {
      f.ask.mockResolvedValue({ status: "ok", reply: `${marker}\nОтличный результат!` });
      const body = await (await POST(request("Я сегодня наконец-то прошёл 5000 шагов"))).json();
      expect(body.reaction).toBeNull();
      expect(body.reply).toBe("Отличный результат!");
    }
  });

  it("keeps at most one reaction when the model sends several", async () => {
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:clap]][[reaction:celebrate]]\nОтличный результат! [[reaction:heart]]" });
    const body = await (await POST(request("Я сегодня наконец-то прошёл 5000 шагов"))).json();
    expect(body.reaction).toBe("clap");
    expect(body.reply).toBe("Отличный результат!");
  });

  it("returns null for a provider policy refusal", async () => {
    f.ask.mockResolvedValue({ status: "ok", refusal: "provider_policy", reply: "[[reaction:heart]]\nignored" });
    const body = await (await POST(request("Спасибо, теперь понятно"))).json();
    expect(body.reaction).toBeNull();
    expect(body.reply).not.toContain("[[");
  });

  it("returns null for guard and quota replies", async () => {
    f.guard.mockResolvedValue({ allowed: false, message: "На сегодня лимит исчерпан." });
    const body = await (await POST(request("Спасибо, теперь понятно"))).json();
    expect(body).toEqual(expect.objectContaining({ reply: "На сегодня лимит исчерпан.", reaction: null }));
    expect(f.ask).not.toHaveBeenCalled();
  });

  it("keeps guests restrained and unsaved", async () => {
    f.audience.mockResolvedValue({ tier: "guest", profileId: null, caseId: null });
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:clap]]\nЗдорово!" });
    expect((await (await POST(request("Я сегодня наконец-то прошёл 5000 шагов"))).json()).reaction).toBeNull();
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:thanks]]\nВсегда пожалуйста." });
    const body = await (await POST(request("Спасибо, теперь понятно"))).json();
    expect(body).toEqual({ reply: "Всегда пожалуйста.", reaction: "thanks" });
    expect(f.save).not.toHaveBeenCalled();
  });

  it("stores registered clients' reactions under their own account", async () => {
    f.audience.mockResolvedValue({ tier: "registered", profileId: "registered-id", caseId: null });
    f.ask.mockResolvedValue({ status: "ok", reply: "[[reaction:strength]]\nВы справились." });
    const body = await (await POST(request("Закончил всё, что планировал на неделю, хотя было тяжело"))).json();
    expect(body.reaction).toBe("strength");
    expect(f.save).toHaveBeenCalledWith(expect.objectContaining({ tier: "registered", profileId: "registered-id", reaction: "strength" }));
  });
});
