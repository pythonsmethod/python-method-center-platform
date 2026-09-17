import { afterEach, describe, expect, it, vi } from "vitest";
import { buildClientMessageEmail } from "@/lib/notifications/client-message-email";
import { readFileSync } from "node:fs";

afterEach(() => vi.unstubAllEnvs());

describe("client message email notifications", () => {
  it("builds neutral Russian Support mail without message or Case content", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pythonmethodcenter.com/");
    const email = buildClientMessageEmail("support", "ru");
    expect(email.subject).toBe("Новое сообщение в Python Method Center");
    expect(email.text).toContain("от службы поддержки");
    expect(email.link).toBe("https://pythonmethodcenter.com/cabinet/chat");
    expect(email.text).not.toContain("пациент");
    expect(email.text).not.toContain("анализ");
  });

  it("builds neutral English Professor mail with the protected-account link", () => {
    const email = buildClientMessageEmail("professor", "en");
    expect(email.subject).toBe("New message in Python Method Center");
    expect(email.text).toContain("from Professor Python");
    expect(email.link).toBe("https://pythonmethodcenter.com/cabinet/dialog");
    expect(email.text).toContain("only after you sign in");
  });

  it("dispatches only after staff messages and uses stable event deduplication", () => {
    const support = readFileSync("lib/support/actions.ts", "utf8");
    const professor = readFileSync("lib/messages/actions.ts", "utf8");
    const sender = readFileSync("lib/notifications/client-message-email.ts", "utf8");
    expect(support.match(/sendClientMessageEmail\(/g)).toHaveLength(2);
    expect(professor).toContain('channel: "professor"');
    expect(sender).toContain("client_email:${input.channel}:${input.messageId}");
    expect(sender).toContain('kind: "client_message"');
  });
});
