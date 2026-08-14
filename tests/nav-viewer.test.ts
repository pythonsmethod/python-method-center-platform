import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Who the header thinks it is talking to.
//
// It used to know only "signed in or not", so a member of the team who
// left the workspace landed on the client-facing site whose only account
// door led to the client cabinet — where Professor Python has no case of
// his own and is told to fill in a questionnaire. The way back was in the
// footer. That reads exactly like having been logged out and returned as
// somebody else, and that is what it was reported as.

describe("the header's account door", () => {
  const nav = readFileSync("components/SiteNav.tsx", "utf8");

  it("sends a member of the team to the workspace, not the client cabinet", () => {
    expect(nav).toContain('const accountHref = isStaff ? "/admin"');
  });

  it("still sends a client to their cabinet and a stranger to sign in", () => {
    expect(nav).toContain('viewer === "client" ? "/cabinet" : "/login"');
  });

  it("lights up on the workspace as well", () => {
    // Without this the team's own page never shows as the current one.
    expect(nav).toContain('isCurrent("/admin")');
  });

  it("has a name for that door in both languages", () => {
    expect(getDictionary("ru").nav["/admin"]).toBe("Рабочее место");
    expect(getDictionary("en").nav["/admin"]).toBe("Workspace");
  });
});

describe("resolving the viewer", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");

  it("treats both staff roles as staff", () => {
    expect(layout).toContain('profile?.role === "admin" || profile?.role === "support"');
  });

  it("never lets the header fail on an auth problem", () => {
    // A nav that throws takes every page with it.
    expect(layout).toMatch(/  } catch {\r?\n    return "anonymous";\r?\n  }/);
  });
});
