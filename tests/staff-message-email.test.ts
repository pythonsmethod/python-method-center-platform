import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildStaffMessageEmail,
  staffMessageRecipients
} from "@/lib/notifications/staff-message-email";

afterEach(() => vi.unstubAllEnvs());

describe("staff message email notifications", () => {
  it("routes Support alerts only to Anna's canonical founder address", () => {
    expect(staffMessageRecipients("anna_support")).toEqual(["dubrovenkoanna@gmail.com"]);
    const email = buildStaffMessageEmail("anna_support", "https://pythonmethodcenter.com/admin/requests");
    expect(email.subject).toBe("Новое сообщение в службе поддержки");
    expect(email.text).toContain("после входа в рабочий кабинет");
    expect(email.text).not.toContain("пациент");
  });

  it("routes Professor alerts to Karen accounts but excludes Anna", () => {
    vi.stubEnv("KAREN_EMAILS", "dubrovenkoanna@gmail.com,karen@example.com,KAREN@example.com");
    vi.stubEnv("KAREN_PRIMARY_EMAIL", "professor@example.com");
    expect(staffMessageRecipients("karen_professor")).toEqual([
      "karen@example.com",
      "professor@example.com"
    ]);
    const email = buildStaffMessageEmail("karen_professor", "https://pythonmethodcenter.com/admin/cases/case-id");
    expect(email.subject).toContain("Professor Python");
    expect(email.text).not.toContain("медицин");
  });

  it("covers typed, voice and Support client-message entry points", () => {
    const professor = readFileSync("lib/messages/actions.ts", "utf8");
    const voice = readFileSync("lib/assistant/client-action-tools.ts", "utf8");
    const support = readFileSync("lib/support/actions.ts", "utf8");
    expect(professor).toContain('audience: "karen_professor"');
    expect(voice).toContain('audience: "karen_professor"');
    expect(support.match(/audience: "anna_support"/g)).toHaveLength(2);
  });
});
