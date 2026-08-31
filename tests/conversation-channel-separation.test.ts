import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Professor Python and support conversation separation", () => {
  it("limits professor messages to Karen and keeps support on its own tables", () => {
    const guard = readFileSync("lib/auth/require-karen.ts", "utf8");
    const threadApi = readFileSync("app/api/messages/thread/route.ts", "utf8");
    const staffAction = readFileSync("lib/messages/actions.ts", "utf8");
    const support = readFileSync("lib/support/queries.ts", "utf8");
    expect(guard).toContain('resolvePrivateAssistantRole(email) === "karen"');
    expect(threadApi).toContain("canAccessProfessorMessages(staff.email)");
    expect(staffAction).toContain("canAccessProfessorMessages(auth.email)");
    expect(support).toContain('from("support_request_messages")');
  });

  it("does not send professor messages to the shared team notification channel", () => {
    expect(readFileSync("lib/messages/actions.ts", "utf8")).not.toContain("notifyTeam");
    expect(readFileSync("app/api/messages/audio/route.ts", "utf8")).not.toContain("notifyTeam");
  });
});
