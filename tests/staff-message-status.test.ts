import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("staff reply case status", () => {
  const source = readFileSync("lib/messages/actions.ts", "utf8");

  it("moves only submitted cases into active review", () => {
    expect(source).toContain('caseRow.status === "ready_for_review"');
    expect(source).toContain('.eq("status", "ready_for_review")');
    expect(source).toContain('.update({ status: "in_review" })');
  });

  it("records the automatic transition in both histories", () => {
    expect(source).toContain('action: "case_state_updated"');
    expect(source).toContain('eventType: "status_changed"');
    expect(source).toContain('trigger: "first_staff_reply"');
  });

  it("refreshes staff and client status screens", () => {
    expect(source).toContain('revalidatePath("/admin/cases")');
    expect(source).toContain('revalidatePath("/cabinet")');
  });
});
