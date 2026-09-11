import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { caseActivityEntries, isClassificationEvent } from "@/lib/cases/activity";
import { caseDetailCopy } from "@/lib/cases/detail-copy";
import type { CaseLifecycleEvent } from "@/lib/cases/lifecycle";

// The Case detail page after the client processing classification was
// retired: no status, no urgency, no direction, no control that could set
// them, and one language on the page at a time.

const state = vi.hoisted(() => ({ locale: "ru" as "ru" | "en" }));

vi.mock("@/lib/i18n/locale", async (original) => ({
  ...(await original<typeof import("@/lib/i18n/locale")>()),
  getLocale: async () => state.locale
}));

const CASE_ID = "11111111-1111-4111-8111-111111111111";

const lifecycleEvents: CaseLifecycleEvent[] = [
  {
    id: "event-created",
    event_type: "case_created",
    from_status: null,
    to_status: null,
    actor_role: "system",
    notes: null,
    created_at: "2026-09-01T10:00:00.000Z"
  },
  {
    id: "event-status",
    event_type: "status_changed",
    from_status: "in_review",
    to_status: "active_support",
    actor_role: "admin",
    notes: null,
    created_at: "2026-09-02T10:00:00.000Z"
  },
  {
    id: "event-payment",
    event_type: "payment_recorded",
    from_status: null,
    to_status: null,
    actor_role: "system",
    notes: null,
    created_at: "2026-09-03T10:00:00.000Z"
  }
];

vi.mock("@/lib/auth/require-staff", () => ({
  getRequiredStaffUser: async () => ({
    status: "authorized",
    userId: "founder-id",
    email: "founder@example.test",
    role: "admin"
  })
}));
vi.mock("@/lib/auth/require-founder", () => ({ canSeeProviderNames: () => true }));
vi.mock("@/lib/auth/require-karen", () => ({
  canAccessProfessorMessages: () => false,
  resolvePrivateAssistantRole: () => "founder"
}));
vi.mock("@/lib/cases/staff-queries", () => ({
  getStaffCaseDetail: async () => ({
    status: "ready",
    case: {
      id: CASE_ID,
      profile_id: "profile-id",
      title: "Case title",
      summary: null,
      status: "active_support",
      urgency: "critical",
      direction: "recovery",
      created_at: "2026-09-01T10:00:00.000Z",
      updated_at: "2026-09-03T10:00:00.000Z",
      profiles: { full_name: null, email: null, phone: null },
      onboarding_submissions: [],
      uploaded_documents: [],
      payments: [],
      case_lifecycle_events: lifecycleEvents
    }
  })
}));
vi.mock("@/lib/cases/review-queries", () => ({ getCaseReview: async () => null }));
vi.mock("@/lib/analytical-picture", () => ({
  getCaseAnalyticalPicture: async () => ({ status: "unavailable" })
}));
vi.mock("@/lib/assistant/history", () => ({
  getAssistantHistoryForCase: async () => ({ status: "ready", messages: [] })
}));
vi.mock("@/lib/messages/queries", () => ({
  getCaseMessages: async () => ({ messages: [], error: null })
}));
vi.mock("@/components/assistant/AssistantChat", () => ({ AssistantChat: () => null }));
vi.mock("@/components/cases/CaseReviewPanel", () => ({ CaseReviewPanel: () => null }));
vi.mock("@/components/cases/CaseAnalyticalPicturePanel", () => ({
  CaseAnalyticalPicturePanel: () => null
}));
vi.mock("@/components/documents/DocumentTimeline", () => ({ DocumentTimeline: () => null }));
vi.mock("@/components/assistant/SavedAssistantThread", () => ({ SavedAssistantThread: () => null }));
vi.mock("@/components/messages/CaseMessageThread", () => ({ CaseMessageThread: () => null }));
// Client forms that stay on the page reach for the app router, which does not
// exist under renderToStaticMarkup.
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} })
}));

async function renderPage(locale: "ru" | "en"): Promise<string> {
  state.locale = locale;
  const { default: Page } = await import("@/app/(admin)/admin/cases/[caseId]/page");

  return renderToStaticMarkup(
    await Page({
      params: Promise.resolve({ caseId: CASE_ID }),
      searchParams: Promise.resolve({})
    })
  );
}

describe("Case detail without classification", () => {
  it("shows no status, urgency or direction anywhere on the page", async () => {
    for (const locale of ["ru", "en"] as const) {
      const html = await renderPage(locale);

      // Labels the retired classification used to print.
      expect(html).not.toMatch(
        /Срочность|Направление|Статус кейса|Urgency|Direction|Case status/
      );
      // The values themselves, in either language.
      expect(html).not.toMatch(
        /Активное сопровождение|Критическая|Восстановление|Active support|Critical|Recovery/
      );
      // And no control that could set them.
      expect(html).not.toMatch(/<select|CaseManagementForm|Сохранить изменения|Save changes/);
    }
  });

  it("renders one language at a time", async () => {
    expect(await renderPage("ru")).toMatch(/[А-Яа-яЁё]/);

    const english = await renderPage("en");
    expect(english).toContain("Team workspace");
    expect(english).not.toMatch(/[А-Яа-яЁё]/);
  });

  it("keeps the page in Russian after switching back", async () => {
    await renderPage("en");
    const russian = await renderPage("ru");

    expect(russian).toContain("Рабочее место команды");
    expect(russian).not.toContain("Team workspace");
  });

  it("shows what happened without the archived classification transition", async () => {
    const html = await renderPage("ru");

    expect(html).toContain("Оплата зафиксирована");
    expect(html).toContain("Кейс создан");
    expect(html).not.toContain("Статус кейса изменён");
  });
});

describe("case activity", () => {
  it("recognises a classification transition by type or by status fields", () => {
    expect(isClassificationEvent(lifecycleEvents[1])).toBe(true);
    expect(isClassificationEvent(lifecycleEvents[0])).toBe(false);
    expect(
      isClassificationEvent({ ...lifecycleEvents[0], to_status: "completed" })
    ).toBe(true);
  });

  it("withholds classification rows and never carries their status fields", () => {
    const entries = caseActivityEntries(lifecycleEvents, "ru");

    expect(entries.map((entry) => entry.id)).toEqual(["event-payment", "event-created"]);
    for (const entry of entries) {
      expect(entry).not.toHaveProperty("from_status");
      expect(entry).not.toHaveProperty("to_status");
    }
  });

  it("labels the activity in the active locale", () => {
    expect(caseActivityEntries(lifecycleEvents, "en")[0].label).toBe("Payment recorded");
    expect(caseActivityEntries(lifecycleEvents, "ru")[0].label).toBe("Оплата зафиксирована");
  });
});

describe("retired case state action", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it.each(["ru", "en"] as const)(
    "returns a localised error in %s and never reaches the database",
    async (locale) => {
      state.locale = locale;

      const service = vi.fn(() => {
        throw new Error("the retired action must not open a database client");
      });
      vi.doMock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: service }));

      const { updateCaseState } = await import("@/lib/cases/staff-actions");
      const form = new FormData();
      form.set("caseId", CASE_ID);
      form.set("status", "completed");
      form.set("urgency", "critical");
      form.set("direction", "recovery");

      const result = await updateCaseState({ status: "idle", message: "" }, form);

      expect(result.status).toBe("error");
      expect(result.message).toMatch(
        locale === "ru" ? /больше не используются/ : /were retired/
      );
      expect(service).not.toHaveBeenCalled();
    }
  );
});

describe("case detail copy", () => {
  it("covers every key in both languages", () => {
    const ru = caseDetailCopy("ru");
    const en = caseDetailCopy("en");

    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());

    for (const [key, value] of Object.entries(en)) {
      if (typeof value === "string") {
        // An English page must not fall through to a Russian default.
        expect(value, key).not.toMatch(/[А-Яа-яЁё]/);
      }
    }
  });
});
