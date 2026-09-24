import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CabinetPage from "@/app/(client)/cabinet/page";

const state = vi.hoisted(() => ({ locale: "en" as "ru" | "en", title: null as string | null }));

vi.mock("@/lib/i18n/locale", async (original) => ({
  ...(await original<typeof import("@/lib/i18n/locale")>()),
  getLocale: async () => state.locale
}));
vi.mock("@/lib/auth/require-user", () => ({
  getRequiredUser: async () => ({ status: "authorized", userId: "synthetic-profile", email: "synthetic@example.test" })
}));
vi.mock("@/lib/cases/queries", () => ({
  getClientCaseShell: async () => ({ status: "ready", case: { id: "synthetic-case", title: state.title } })
}));
vi.mock("@/lib/health/queries", () => ({ hasQuestionnaire: async () => true }));
vi.mock("@/lib/messages/queries", () => ({
  getCaseMessages: async () => ({ messages: [] }),
  getUnreadForClient: async () => 0
}));
vi.mock("@/lib/support/queries", () => ({ getClientSupportUnreadCount: async () => 0 }));
vi.mock("@/lib/assistant/client-voice-pilot", () => ({ isClientVoicePilot: () => false }));
vi.mock("@/components/cabinet/CabinetAnhamCard", () => ({
  CabinetAnhamCard: ({ text }: { text: string }) => <p>{text}</p>
}));

beforeEach(() => {
  state.locale = "en";
  state.title = null;
});

describe("paid Case before medical intake", () => {
  it.each([
    ["en", "First complete the questionnaire", "Complete questionnaire"],
    ["ru", "Сначала заполните анкету", "Заполнить анкету"]
  ] as const)("does not claim a review has started in %s", async (locale, preview, cta) => {
    state.locale = locale;
    const html = renderToStaticMarkup(await CabinetPage());
    expect(html).toContain(preview);
    expect(html).toContain(`href="/onboarding">${cta}`);
    expect(html).not.toContain("I am reviewing your materials");
    expect(html).not.toContain("Я изучаю ваши материалы");
  });

  it("keeps the regular dialogue invitation after intake", async () => {
    state.title = "Submitted intake";
    const html = renderToStaticMarkup(await CabinetPage());
    expect(html).toContain("I am reviewing your materials");
    expect(html).toContain('href="/cabinet/dialog">Continue conversation');
  });
});
