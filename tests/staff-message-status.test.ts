import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("staff reply without case classification", () => {
  const source = readFileSync("lib/messages/actions.ts", "utf8");

  it("does not read, change or record a retired case state", () => {
    expect(source).not.toContain('caseRow.status === "ready_for_review"');
    expect(source).not.toContain('.update({ status: "in_review" })');
    expect(source).not.toContain('action: "case_state_updated"');
    expect(source).not.toContain('eventType: "status_changed"');
    expect(source).not.toContain('trigger: "first_staff_reply"');
  });

  it("refreshes the staff and client conversation screens", () => {
    expect(source).toContain('revalidatePath("/admin/cases")');
    expect(source).toContain('revalidatePath("/cabinet")');
  });
});
