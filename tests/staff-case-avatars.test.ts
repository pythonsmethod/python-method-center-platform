import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("staff client avatars", () => {
  it("shows private profile photos in Karen's queue and case list", () => {
    const home = readFileSync("app/(admin)/admin/page.tsx", "utf8");
    const cases = readFileSync("app/(admin)/admin/cases/page.tsx", "utf8");
    const detail = readFileSync("app/(admin)/admin/cases/[caseId]/page.tsx", "utf8");

    expect(home).toContain('className="karen-client-card__avatar"');
    expect(home).toContain("avatarUrls[clientCase.profiles.avatar_path]");
    expect(cases).toContain('className="staff-client-card__avatar"');
    expect(cases).toContain('className="staff-case-client"');
    expect(detail).toContain('className="staff-case-profile-heading"');
  });
});
