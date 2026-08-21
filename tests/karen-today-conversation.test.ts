import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const todayPage = readFileSync(
  new URL("../app/(admin)/admin/page.tsx", import.meta.url),
  "utf8"
);
const casePage = readFileSync(
  new URL("../app/(admin)/admin/cases/[caseId]/page.tsx", import.meta.url),
  "utf8"
);

describe("Karen's Today queue", () => {
  it("opens a queued client in the focused Today workspace", () => {
    expect(todayPage).toContain(
      "href={`/admin/cases/${clientCase.id}?view=today`}"
    );
  });

  it("shows only the conversation and case assistant in that focused branch", () => {
    const branchStart = casePage.indexOf("if (focusedTodayView)");
    const branchEnd = casePage.indexOf("const submissions =", branchStart);
    const branch = casePage.slice(branchStart, branchEnd);

    expect(branch).toContain("<CaseMessageThread");
    expect(branch).toContain("<AssistantChat");
    expect(branch.indexOf("<CaseMessageThread")).toBeLessThan(
      branch.indexOf("<AssistantChat")
    );
    expect(branch).not.toContain("<DocumentTimeline");
    expect(branch).not.toContain("<CaseReviewPanel");
    expect(branch).not.toContain("<CaseManagementForm");
  });
});
