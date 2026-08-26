import { afterEach, describe, expect, it } from "vitest";
import { resolveStaffLandingPath } from "@/lib/auth/staff-landing";

const originalFounderEmails = process.env.FOUNDER_EMAILS;

afterEach(() => {
  if (originalFounderEmails === undefined) delete process.env.FOUNDER_EMAILS;
  else process.env.FOUNDER_EMAILS = originalFounderEmails;
});

describe("staff landing destination", () => {
  it("sends Anna to her founder overview", () => {
    expect(resolveStaffLandingPath("admin", "DubrovenkoAnna@gmail.com"))
      .toBe("/admin/founder");
  });

  it("keeps Karen and support in the team workspace", () => {
    expect(resolveStaffLandingPath("admin", "karen@example.com")).toBe("/admin");
    expect(resolveStaffLandingPath("support", "support@example.com")).toBe("/admin");
  });

  it("does not route clients into a staff workspace", () => {
    expect(resolveStaffLandingPath("client", "client@example.com")).toBeNull();
  });
});
