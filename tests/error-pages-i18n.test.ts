import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("localized error pages", () => {
  it("provides a bilingual 404 with localized metadata", () => {
    const source = readFileSync("app/not-found.tsx", "utf8");

    expect(source).toContain('title: "Страница не найдена"');
    expect(source).toContain('title: "Page not found"');
    expect(source).toContain("generateMetadata");
    expect(source).toContain("robots: { index: false, follow: false }");
  });

  it("provides both locale variants for runtime errors", () => {
    const source = readFileSync("app/error.tsx", "utf8");

    expect(source).toContain('className="locale-copy locale-copy--ru"');
    expect(source).toContain('className="locale-copy locale-copy--en"');
    expect(source).not.toContain("{error.message");
  });
});
