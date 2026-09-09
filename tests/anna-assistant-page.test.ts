import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ locale: "ru" }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: async () => state.locale }));
vi.mock("@/lib/auth/require-staff", () => ({ getRequiredStaffUser: async () => ({ status: "authorized", email: "anna@example.test" }) }));
vi.mock("@/lib/auth/require-karen", () => ({ resolvePrivateAssistantRole: () => "founder" }));
vi.mock("@/lib/assistant/router", () => ({ hasAssistantEnv: () => true }));
vi.mock("@/components/assistant/AssistantChat", () => ({ AssistantChat: () => null }));
vi.mock("@/components/assistant/KarenAnhamWorkspace", () => ({ KarenAnhamWorkspace: () => null }));
describe("Anna single-window assistant", () => {
  it("renders Russian, English and Russian again on the same page", async () => {
    const { default: Page } = await import("@/app/(admin)/admin/assistant/page");
    for (const locale of ["ru", "en", "ru"]) {
      state.locale = locale;
      const html = renderToStaticMarkup(await Page());
      expect(html).toContain(locale === "ru" ? "Личный помощник Анны" : "personal assistant");
      expect(html).toContain(locale === "ru" ? "Запомни" : "Remember");
      expect(html).not.toMatch(/Общая память|Shared memory|KnowledgePanel|Professor Python/);
      expect(html.match(/<section class="panel"/g)).toHaveLength(1);
      if (locale === "en") expect(html).not.toMatch(/[А-Яа-яЁё]/);
    }
  });
});
