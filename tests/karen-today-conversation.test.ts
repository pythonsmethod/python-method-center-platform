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
const conversationWorkspace = readFileSync(
  new URL("../components/cases/CaseConversationWorkspace.tsx", import.meta.url),
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

    expect(branch).toContain("<CaseConversationWorkspace");
    expect(conversationWorkspace).toContain("<AssistantChat");
    expect(conversationWorkspace).toContain("<CaseMessageThread");
    expect(conversationWorkspace.indexOf("<AssistantChat")).toBeLessThan(
      conversationWorkspace.indexOf("<CaseMessageThread")
    );
    expect(branch).not.toContain("<DocumentTimeline");
    expect(branch).not.toContain("<CaseReviewPanel");
    expect(branch).not.toContain("<CaseManagementForm");
  });

  it("moves an assistant answer into an editable client draft without sending it", () => {
    expect(conversationWorkspace).toContain("onUseReply={(text) => setDraft");
    expect(conversationWorkspace).toContain("externalDraft={draft}");
    expect(conversationWorkspace).not.toContain("formAction(");
    expect(casePage).toContain('useReply: "Вставить в ответ клиенту"');
    expect(casePage).toContain('useReply: "Insert into client reply"');
  });
});
