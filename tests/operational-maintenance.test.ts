import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isCronAuthorized, summarizeMaintenance } from "@/lib/maintenance/cron";

describe("authenticated operational maintenance", () => {
  it("fails closed when the secret is missing", () => {
    expect(isCronAuthorized("Bearer anything", undefined)).toBe(false);
  });

  it("rejects an absent or incorrect authorization header", () => {
    expect(isCronAuthorized(null, "correct")).toBe(false);
    expect(isCronAuthorized("Bearer wrong", "correct")).toBe(false);
  });

  it("accepts only the exact Vercel cron bearer value", () => {
    expect(isCronAuthorized("Bearer correct", "correct")).toBe(true);
  });

  it("reports an empty queue as a complete, zero-work run", () => {
    expect(summarizeMaintenance({
      documents: 0,
      outcomes: {},
      expiredPeriods: 0,
      lifecycleEvents: 0,
      casesAligned: 0,
      durationMs: 9,
      reachedLimit: false
    })).toMatchObject({
      processedCount: 0,
      failedCount: 0,
      retriedCount: 0,
      complete: true,
      truncated: false
    });
  });

  it("separates processed, failed and retried batch outcomes", () => {
    expect(summarizeMaintenance({
      documents: 7,
      outcomes: { ready: 3, retrying: 2, failed: 1, needs_reupload: 1 },
      expiredPeriods: 4,
      lifecycleEvents: 4,
      casesAligned: 1,
      durationMs: 100,
      reachedLimit: true
    })).toMatchObject({
      processedCount: 5,
      failedCount: 2,
      retriedCount: 2,
      expiredPeriodsCount: 4,
      complete: false,
      truncated: true
    });
  });
});

describe("period-expiry database contract", () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "supabase/migrations/20260903204800_operational_core_maintenance.sql"),
    "utf8"
  );

  it("expires only elapsed active periods", () => {
    expect(sql).toContain("sp.status = 'active'");
    expect(sql).toContain("sp.ends_at <= maintenance_now");
  });

  it("keeps future active or scheduled renewals from changing the case", () => {
    expect(sql).toContain("later.status in ('active', 'scheduled')");
    expect(sql).toContain("later.ends_at");
  });

  it("audits completion once and makes repeated runs safe", () => {
    expect(sql).toContain("case_lifecycle_service_period_completed_key");
    expect(sql).toContain("on conflict ((metadata ->> 'service_period_id'))");
    expect(sql).toContain("'service_period_completed'");
  });

  it("changes only an explicitly active-support case", () => {
    expect(sql).toContain("cc.status = 'active_support'");
    expect(sql).toContain("'inactive_support'");
  });
});
