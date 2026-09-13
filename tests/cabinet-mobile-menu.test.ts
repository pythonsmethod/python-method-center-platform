import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shellSource = readFileSync("components/cabinet/CabinetShell.tsx", "utf8");

describe("cabinet mobile menu", () => {
  it("shows an explicit menu label in both supported locales", () => {
    expect(shellSource).toContain('ru ? "Меню" : "Menu"');
    expect(shellSource).toContain('aria-label={ru ? "Открыть меню кабинета" : "Open cabinet menu"}');
  });
});
