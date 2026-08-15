import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile home header", () => {
  it("keeps the brand and language switch below the device top edge", () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), "app", "globals.css"),
      "utf8"
    );

    expect(css).toContain("body:has(.app-home) .site-header");
    expect(css).toContain(
      "padding-block: calc(16px + env(safe-area-inset-top)) 10px;"
    );
    expect(css).toContain(
      "min-height: calc(64px + env(safe-area-inset-top));"
    );
  });
});
