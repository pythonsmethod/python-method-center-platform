import { afterEach, describe, expect, it } from "vitest";
import {
  isKarenAssistantEmail,
  karenAllowlist
} from "@/lib/auth/require-karen";

describe("private expert assistant access", () => {
  const original = process.env.KAREN_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.KAREN_EMAILS;
    else process.env.KAREN_EMAILS = original;
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
});
