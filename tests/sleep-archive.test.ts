import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("archived sleep tracker", () => {
  it("is absent from the website and app navigation", () => {
    const shell = readFileSync(join(process.cwd(), "components/cabinet/CabinetShell.tsx"), "utf8");
    const app = readFileSync(join(process.cwd(), "components/cabinet/AppScreen.tsx"), "utf8");
    expect(shell).not.toContain("/sleep");
    expect(app).not.toContain("/cabinet/sleep");
  });

  it("redirects old bookmarks instead of exposing the tracker", () => {
    const page = readFileSync(join(process.cwd(), "app/(client)/cabinet/sleep/page.tsx"), "utf8");
    expect(page).toContain('redirect("/cabinet")');
    expect(page).not.toContain("SleepPanel");
  });
});
