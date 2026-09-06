import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldBlockIdentityMismatch } from "@/lib/documents/identity-review";

describe("manual document identity review", () => {
  it("fails closed until an authorized review is stored", () => {
    expect(shouldBlockIdentityMismatch("mismatch", "unreviewed")).toBe(true);
    expect(shouldBlockIdentityMismatch("mismatch", null)).toBe(true);
    expect(shouldBlockIdentityMismatch("mismatch", "confirmed_belongs_to_case")).toBe(false);
    expect(shouldBlockIdentityMismatch("match", "unreviewed")).toBe(false);
  });

  it("keeps the automatic mismatch and audit decision separate", () => {
    const processing = readFileSync("lib/documents/processing.ts", "utf8");
    const migration = readFileSync("supabase/migrations/20260906110000_document_identity_manual_review.sql", "utf8");
    expect(processing).toContain("shouldBlockIdentityMismatch(identity.status, document.identity_review_status)");
    expect(migration).toContain("identity_review_status");
    expect(migration).toContain("identity_reviewed_by");
    expect(migration).not.toContain("update public.profiles");
  });
});
