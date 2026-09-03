import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function migration(name: string) {
  return fs.readFileSync(path.join(process.cwd(), "supabase/migrations", name), "utf8");
}

describe("server-only operational core schema", () => {
  it("keeps Case ownership and next actions out of client access", () => {
    const sql = migration("20260903205342_case_operational_control.sql");
    expect(sql).toContain("case_assignments_one_current_idx");
    expect(sql).toContain("case_next_actions");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on public.case_next_actions from anon, authenticated");
    expect(sql).toContain("requires_human_direction");
    expect(sql).toContain("on conflict(dedupe_key) do nothing");
  });

  it("keeps reconciliation server-only and assigns every historical alert a terminal gate", () => {
    const sql = migration("20260903205711_payment_reconciliation_items.sql");
    expect(sql).toContain("payment_reconciliation_items");
    expect(sql).toContain("stripe_event_id text not null unique");
    expect(sql).toContain("REQUIRES_OWNER_IDENTIFICATION");
    expect(sql).toContain("revoke all on public.payment_reconciliation_items from anon,authenticated");
    expect(sql).toContain("on conflict(stripe_event_id) do nothing");
  });
});
