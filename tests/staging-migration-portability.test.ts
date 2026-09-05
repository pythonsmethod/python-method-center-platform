import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("staging migration portability", () => {
  it("keeps the case-number schema migration independent of production rows", () => {
    const sql = readFileSync(
      "supabase/migrations/20260830145618_start_case_numbers_at_480.sql",
      "utf8",
    ).toLowerCase();

    expect(sql).not.toContain("a70522e7-ed3b-4d68-a500-706a6d21e4ff");
    expect(sql).not.toContain("raise exception");
    expect(sql).not.toContain("owned by public.client_cases.case_number");
    expect(sql).toContain("alter column case_number");
  });
});
