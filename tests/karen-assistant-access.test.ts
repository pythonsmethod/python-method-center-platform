import { afterEach, describe, expect, it } from "vitest";
import {
  isKarenAssistantEmail,
  karenAllowlist,
  resolvePrivateAssistantRole
} from "@/lib/auth/require-karen";

describe("private expert assistant access", () => {
  const original = process.env.KAREN_EMAILS;
  const originalFounders = process.env.FOUNDER_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.KAREN_EMAILS;
    else process.env.KAREN_EMAILS = original;
    if (originalFounders === undefined) delete process.env.FOUNDER_EMAILS;
    else process.env.FOUNDER_EMAILS = originalFounders;
  });

  it("fails closed when no email is configured", () => {
    delete process.env.KAREN_EMAILS;

    expect(karenAllowlist()).toEqual([]);
    expect(isKarenAssistantEmail("admin@example.com")).toBe(false);
  });

  it("allows only configured emails, case-insensitively", () => {
    process.env.KAREN_EMAILS = " anna@example.com, karen@example.com ";

    expect(isKarenAssistantEmail("ANNA@example.com")).toBe(true);
    expect(isKarenAssistantEmail("karen@example.com")).toBe(true);
    expect(isKarenAssistantEmail("support@example.com")).toBe(false);
    expect(isKarenAssistantEmail(null)).toBe(false);
  });

  it("recognizes the primary founder independently of Karen's allowlist", () => {
    delete process.env.KAREN_EMAILS;

    expect(resolvePrivateAssistantRole("DubrovenkoAnna@gmail.com")).toBe("founder");
  });

  it("gives founder identity precedence when an email is in both lists", () => {
    process.env.FOUNDER_EMAILS = "anna@example.com";
    process.env.KAREN_EMAILS = "anna@example.com,karen@example.com";

    expect(resolvePrivateAssistantRole("anna@example.com")).toBe("founder");
    expect(resolvePrivateAssistantRole("karen@example.com")).toBe("karen");
  });
});
