import { afterEach, describe, expect, it, vi } from "vitest";
import { sendGuestSupportEmail } from "@/lib/notifications/guest-support-email";

const input = { requestId: "de305d54-75b4-431b-adb2-eb6b9e546014", subject: "Другой вопрос", guestName: "Иван Иванов", guestEmail: "guest@example.com", guestPhone: "+1 202 555 0123", message: "Текст обращения гостя", link: "https://pythonmethodcenter.com/admin/requests#request-id" };

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("guest support email", () => {
  it("sends the complete request with Reply-To set to the guest", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", "karen@example.com");
    vi.stubEnv("SUPPORT_FROM_EMAIL", "Python Method Center <support@example.com>");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    await expect(sendGuestSupportEmail(input)).resolves.toBe("sent");
    const [, request] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(request?.body));
    expect(payload).toMatchObject({ to: ["karen@example.com"], reply_to: "guest@example.com" });
    expect(payload.text).toContain("Текст обращения гостя");
  });

  it("skips when email is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("SUPPORT_NOTIFICATION_EMAIL", ""); vi.stubEnv("KAREN_EMAILS", ""); vi.stubEnv("SUPPORT_FROM_EMAIL", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(sendGuestSupportEmail(input)).resolves.toBe("skipped");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
