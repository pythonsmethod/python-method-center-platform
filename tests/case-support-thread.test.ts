import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("app/(admin)/admin/cases/[caseId]/page.tsx", "utf8");
const actions = readFileSync("lib/support/actions.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260917090000_case_support_thread.sql", "utf8");
const copy = readFileSync("lib/cases/detail-copy.ts", "utf8");

describe("case-scoped support conversation", () => {
  it("is present for authorized staff independently of Professor access", () => {
    expect(page).toContain("getCaseSupportThread(clientCase.id)");
    expect(page).toContain("supportConversationHeading");
    expect(page).toContain("caseId={clientCase.id}");
    expect(page.indexOf("supportConversationHeading")).toBeGreaterThan(page.indexOf("canReadProfessorConversation ? <section"));
  });

  it("authorizes staff, resolves the Case owner server-side and audits the message", () => {
    expect(actions).toContain("sendStaffCaseSupportMessage");
    expect(actions).toContain("getStaffUserState()");
    expect(actions).toContain('.from("client_cases")');
    expect(actions).toContain("profile_id: caseRow.profile_id");
    expect(actions).toContain('action: "support_message_created"');
  });

  it("creates one dedicated thread per Case and has complete RU/EN copy", () => {
    expect(migration).toContain("is_case_thread boolean not null default false");
    expect(migration).toContain("unique index");
    expect(copy).toContain('supportConversationLabel: "Служба поддержки"');
    expect(copy).toContain('supportConversationLabel: "Support"');
  });
});
