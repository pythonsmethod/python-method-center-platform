import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Anham panel viewport layout", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

  it("keeps the panel inside the dynamic viewport", () => {
    expect(css).toContain("height: min(720px, calc(100dvh - 32px))");
    expect(css).toContain("max-height: calc(100dvh - 32px)");
  });

  it("scrolls the conversation instead of pushing away the composer", () => {
    expect(css).toContain(".anham-panel > .assistant-chat");
    expect(css).toContain(".anham-panel .assistant-chat__messages");
    expect(css).toContain("min-height: 0");
  });

  it("does not reserve avatar space below an open panel", () => {
    expect(css).toContain(".anham-companion.is-open > .anham-companion__figure");
    expect(css).toContain("display: none");
  });
});
