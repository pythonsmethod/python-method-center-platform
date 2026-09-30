import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffDocumentIntakePage from "@/app/(admin)/admin/documents/page";
import { formatDateTime } from "@/lib/i18n/format";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), locale: vi.fn(), documents: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ getRequiredStaffUser: mocks.auth }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: mocks.locale }));
vi.mock("@/lib/documents/staff-queries", () => ({ getStaffDocumentIntakeItems: mocks.documents }));
vi.mock("@/components/LogoutButton", () => ({ LogoutButton: ({ label }: { label: string }) => <button>{label}</button> }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ status: "authorized", role: "support", email: null });
  mocks.locale.mockResolvedValue("ru");
  mocks.documents.mockResolvedValue({ status: "ready", documents: [] });
});

const rawError = "Could not embed because more than one relationship was found for uploaded_documents and profiles";
async function render() { return renderToStaticMarkup(await StaffDocumentIntakePage()); }

describe("staff Documents localization and access", () => {
  it.each(["ru", "en"] as const)("renders the complete empty state in %s", async (locale) => {
    mocks.locale.mockResolvedValue(locale);
    const html = await render();
    expect(html).toContain(locale === "ru" ? "Загруженных документов пока нет." : "There are no uploaded documents yet.");
    expect(html).toContain(locale === "ru" ? 'aria-label="Загруженные документы"' : 'aria-label="Uploaded documents"');
    expect(html).toContain(locale === "ru" ? "Роль: Поддержка" : "Role: Support");
    expect(html).toContain(locale === "ru" ? "Выйти" : "Sign out");
    if (locale === "en") expect(html).not.toMatch(/[А-Яа-яЁё]/);
    else expect(html).not.toMatch(/Internal intake|Documents|Read-only|Authorized staff|Scope|Role:|support/);
  });

  it.each(["ru", "en"] as const)("localizes all document statuses and dates in %s", async (locale) => {
    mocks.locale.mockResolvedValue(locale);
    const created = "2026-09-29T12:00:00Z";
    mocks.documents.mockResolvedValue({ status: "ready", documents: ["identity_mismatch", "failed", "future_status"].map((status, index) => ({
      id: `document-${index}`, case_id: "case-1", profile_id: "owner-1", original_filename: null,
      profiles: null, client_cases: null, document_status: status, created_at: created
    })) });
    const html = await render();
    expect(html).toContain(locale === "ru" ? "Нужно проверить принадлежность документа" : "Document ownership needs review");
    expect(html).toContain(locale === "ru" ? "Ошибка обработки" : "Processing failed");
    expect(html).toContain(locale === "ru" ? "Состояние не определено" : "Status unknown");
    expect(html).toContain(formatDateTime(created, locale));
    expect(html).toContain("/admin/documents/document-0/view");
    if (locale === "en") expect(html).not.toMatch(/[А-Яа-яЁё]/);
  });

  it.each(["ru", "en"] as const)("shows a helpful %s error without raw database details", async (locale) => {
    mocks.locale.mockResolvedValue(locale);
    mocks.documents.mockResolvedValue({ status: "error", message: rawError });
    const html = await render();
    expect(html).toContain(locale === "ru" ? "Не удалось загрузить список документов" : "Unable to load the document list");
    expect(html).not.toContain(rawError);
    expect(html).not.toContain("uploaded_documents");
    if (locale === "en") expect(html).not.toMatch(/[А-Яа-яЁё]/);
  });

  it.each(["missing-env", "error"])("does not query documents when access is %s", async (status) => {
    mocks.auth.mockResolvedValue({ status, message: rawError });
    const html = await render();
    expect(html).toContain("Документы");
    expect(html).not.toContain(rawError);
    expect(mocks.documents).not.toHaveBeenCalled();
  });

  it("denies forbidden access before querying documents", async () => {
    mocks.auth.mockResolvedValue({ status: "forbidden" });
    await expect(render()).rejects.toThrow("NOT_FOUND");
    expect(mocks.documents).not.toHaveBeenCalled();
  });

  it("localizes missing server configuration", async () => {
    mocks.locale.mockResolvedValue("en");
    mocks.documents.mockResolvedValue({ status: "missing-service-role", message: "Service role key required" });
    const html = await render();
    expect(html).toContain("Document access has not been configured yet");
    expect(html).not.toContain("Service role");
    expect(html).not.toMatch(/[А-Яа-яЁё]/);
  });
});
