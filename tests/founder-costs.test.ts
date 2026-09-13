import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { summarizeLiveCosts } from "@/lib/founder/costs";

describe("Anna-only platform costs", () => {
  it("totals only valid server-audited Live usage", () => {
    const rows = summarizeLiveCosts([
      { id: "one", created_at: "2026-09-13T10:00:00Z", metadata: { seconds: 60, estimatedUsd: 0.05, finalized: true } },
      { id: "bad", created_at: "2026-09-13T10:01:00Z", metadata: { seconds: -1, estimatedUsd: "9" } },
    ]);
    expect(rows).toEqual([{ id: "one", createdAt: "2026-09-13T10:00:00Z", seconds: 60, estimatedUsd: 0.05, finalized: true }]);
  });

  it("gates both the navigation link and page with Anna's server-verified identity", () => {
    const layout = readFileSync("app/(admin)/admin/layout.tsx", "utf8");
    const page = readFileSync("app/(admin)/admin/costs/page.tsx", "utf8");
    expect(layout).toContain('canSeeVoicePilotCosts(auth.email)');
    expect(layout).toContain('href: "/admin/costs"');
    expect(page).toContain('!canSeeVoicePilotCosts(auth.email)');
    expect(page).toContain("notFound()");
  });

  it("labels unknown vendor bills instead of inventing a total", () => {
    const source = readFileSync("lib/founder/costs.ts", "utf8");
    expect(source).toContain('costUsd: null, source: "vendor_bill"');
    expect(source).toContain("revenue is not a platform expense");
  });
});
