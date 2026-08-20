import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile navigation across viewer states", () => {
  const layout = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8");
  const dock = fs.readFileSync(
    path.join(process.cwd(), "components", "PublicMobileDock.tsx"),
    "utf8"
  );
  const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");

  it("renders the bottom dock for guests, clients, and staff", () => {
    expect(layout).toContain("<PublicMobileDock locale={locale} viewer={viewer} />");
    expect(layout).not.toContain('viewer === "anonymous" ? <PublicMobileDock');
    expect(dock).toContain('viewer === "staff"');
    expect(dock).toContain('viewer === "client"');
    expect(dock).toContain('href: "/admin"');
    expect(dock).toContain('href: "/cabinet"');
    expect(dock).toContain('href: "/login"');
  });

  it("uses the bottom dock on narrow or touch-first devices", () => {
    expect(css).toContain(
      "@media (max-width: 560px), (hover: none) and (pointer: coarse)"
    );
    expect(css).not.toContain(".native-app-route .public-mobile-dock");
  });
});
