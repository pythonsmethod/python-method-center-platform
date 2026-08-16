import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("cabinet navigation back to the website", () => {
  const shell = readFileSync(join(process.cwd(), "components/cabinet/CabinetShell.tsx"), "utf8");

  it("offers an explicit main website link in both languages", () => {
    expect(shell).toContain('href: "/"');
    expect(shell).toContain("Главная страница сайта");
    expect(shell).toContain("Main website");
  });

  it("makes the cabinet home label unambiguous", () => {
    expect(getDictionary("ru").cabinet.sections.home.title).toBe("Главная кабинета");
    expect(getDictionary("en").cabinet.sections.home.title).toBe("Cabinet home");
  });

  it("also makes the center logo lead to the website home", () => {
    expect(shell).toContain('className="web-cab__brand" href="/"');
  });
});
