import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";

describe("search indexing signals", () => {
  it("publishes one canonical HTTPS host and dated public URLs", () => {
    const entries = sitemap();

    expect(entries).toHaveLength(9);
    expect(entries.every((entry) => entry.url.startsWith("https://pythonmethodcenter.com"))).toBe(true);
    expect(entries.every((entry) => entry.lastModified instanceof Date)).toBe(true);
  });

  it("collapses alternate hosts with a permanent redirect", () => {
    const middleware = readFileSync("middleware.ts", "utf8");

    expect(middleware).toContain("requestHost.toLowerCase() === alternateHost.toLowerCase()");
    expect(middleware).toContain("NextResponse.redirect(destination, 308)");
  });

  it("keeps login query variants out of the index with one canonical URL", () => {
    const login = readFileSync("app/(auth)/login/page.tsx", "utf8");

    expect(login).toContain('alternates: { canonical: "/login" }');
    expect(login).toContain("robots: { index: false, follow: false }");
  });
});
