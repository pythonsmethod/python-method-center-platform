import { describe, expect, it, vi } from "vitest";
import catalog from "@/lib/assistant/karen-philosophy.json";
import { ANHAM_KAREN_PHILOSOPHY } from "@/lib/assistant/karen-philosophy";
import { normalizeAnhamResponse } from "@/lib/assistant/response-style";
import { voiceInstructions, voicePersona } from "@/lib/assistant/realtime-server";
import { TRANSCRIPTION_SYSTEM_PROMPT } from "@/lib/assistant/transcription";
import { METADATA_SYSTEM_PROMPT } from "@/lib/assistant/metadata";

vi.mock("@/lib/assistant/knowledge", () => ({ getKnowledgeForPrompt: async () => "" }));
import { buildGuestSystemPrompt, buildPaidClientSystemPrompt, buildRegisteredSystemPrompt, buildStaffSystemPrompt } from "@/lib/assistant/prompts";

describe("Karen's communication profile reaches existing Anham channels", () => {
  it.each([
    ["guest", () => buildGuestSystemPrompt()],
    ["registered", () => buildRegisteredSystemPrompt(null)],
    ["paid", () => buildPaidClientSystemPrompt("Synthetic source: 3.2 mg/L, needs review")],
    ["founder", () => buildStaffSystemPrompt("founder")],
    ["Karen", () => buildStaffSystemPrompt("karen")],
  ] as const)("retains the complete profile for %s even if dynamic knowledge is unavailable", async (_name, build) => {
    const prompt = await build();
    expect(prompt).toContain(ANHAM_KAREN_PHILOSOPHY);
    expect(prompt).toContain('"id":"A24"');
    expect(prompt).toContain("Ты Анхам, ИИ-помощник, а не Professor Python");
    expect(prompt).toContain("Never promise a cure");
  });

  for (const scope of ["founder", "karen", "client"] as const) {
    it.each(["ru", "en"] as const)(`shares the profile in %s realtime and Live for ${scope} without changing the role`, (locale) => {
      const actor = { profileId: "synthetic", email: "synthetic@example.test", scope, caseId: null, tier: "registered" as const };
      // voicePersona is also passed to the existing GPT-Live session adapter.
      expect(voicePersona(actor)).toContain(ANHAM_KAREN_PHILOSOPHY);
      const instructions = voiceInstructions(actor, locale);
      expect(instructions).toContain(ANHAM_KAREN_PHILOSOPHY);
      expect(instructions).toContain(locale === "ru" ? "Russian only" : "English only");
      if (scope === "client") expect(instructions).toContain("No site-data tools are available to clients");
      if (scope === "karen") expect(instructions).toContain("Only Karen makes Case decisions");
    });
  }

  it("keeps medical extraction and literal evidence outside philosophical presentation", () => {
    expect(TRANSCRIPTION_SYSTEM_PROMPT).not.toContain("ANHAM_KAREN_PHILOSOPHY");
    expect(METADATA_SYSTEM_PROMPT).not.toContain("ANHAM_KAREN_PHILOSOPHY");
    const source = "CRP 3,2 mg/L; reference <5; −0.5; 20.09.2026; SOURCE_ONLY";
    expect(normalizeAnhamResponse(source, "ru")).toBe(source);
  });

  it("separates new wording, translated quotes and sourced traditions in both languages", () => {
    expect(catalog.phrases).toHaveLength(24);
    for (const phrase of catalog.phrases) {
      expect(phrase.kind).toBe("editorial");
      expect(phrase.ru).toMatch(/[а-я]/i);
      expect(phrase.en).toMatch(/[a-z]/i);
      expect(phrase.en).not.toMatch(/[а-я]/i);
    }
    expect(new Set(catalog.phrases.map(p => p.id)).size).toBe(24);
    for (const quote of catalog.karenQuotes) expect(quote.enKind).toContain("not verbatim");
    for (const foundation of catalog.foundations) {
      expect(foundation.url).toMatch(/^https:\/\//);
      expect(foundation.source).toBeTruthy();
      expect(foundation.use).toBeTruthy();
    }
    expect(catalog.karenQuotes.find(q => q.id === "K07")?.faithOnly).toBe(true);
    expect(catalog.foundations.find(f => f.id === "F05")?.faithOnly).toBe(true);
    expect(catalog.foundations.find(f => f.id === "F06")?.source).toContain("not ancient");
  });

  it("does not put the unreviewed source monologue or its efficacy claims in the public catalog", () => {
    const projection = JSON.stringify(catalog);
    expect(projection).not.toContain("Организм выздоравливает в 10 раз быстрее");
    expect(projection).not.toContain("регенерационные способности человека сверхъестественны");
    expect(ANHAM_KAREN_PHILOSOPHY).toContain("Faith-specific language is opt-in");
    expect(ANHAM_KAREN_PHILOSOPHY).toContain("по существующим правилам безопасности, прямо и без цитат");
    expect(ANHAM_KAREN_PHILOSOPHY).toContain("no philosophy immediately");
  });
});
