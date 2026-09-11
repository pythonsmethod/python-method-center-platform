import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("retired client processing classification", () => {
  it("does not render or sort the staff case lists by status or urgency", () => {
    for (const path of [
      "app/(admin)/admin/cases/page.tsx",
      "app/(admin)/admin/page.tsx"
    ]) {
      const source = read(path);
      expect(source).not.toMatch(/caseStatusLabel|caseUrgencyLabel|urgencyLabels|statusLabels/);
      expect(source).not.toMatch(/Срочность|Urgency|Критическая|Critical/);
    }
  });

  it("does not expose case or request classification through active data tools", () => {
    const catalog = read("lib/assistant/site-data-catalog.ts");
    const caseDataset = catalog.match(/cases: dataset\([^\n]+/)?.[0] ?? "";
    const requestDataset = catalog.match(/support_requests: dataset\([^\n]+/)?.[0] ?? "";

    expect(caseDataset).not.toMatch(/\bstatus\b|\burgency\b|\bdirection\b/);
    expect(requestDataset).not.toMatch(/\bstatus\b|\burgency\b|\bdirection\b/);
  });

  it("does not write an automatic state during onboarding or staff reply", () => {
    const onboarding = read("lib/onboarding/actions.ts");
    const messages = read("lib/messages/actions.ts");

    expect(onboarding).not.toContain('status: "ready_for_review"');
    expect(messages).not.toContain('.update({ status: "in_review" })');
    expect(messages).not.toContain('eventType: "status_changed"');
  });
});
