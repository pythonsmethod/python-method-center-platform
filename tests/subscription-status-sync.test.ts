import { describe, expect, it } from "vitest";
import { localSubscriptionStatus } from "@/lib/payments/subscription-status";

describe("localSubscriptionStatus", () => {
  it("treats an expired unpaid start as cancelled, not active", () => {
    expect(localSubscriptionStatus("incomplete_expired")).toBe("cancelled");
    expect(localSubscriptionStatus("canceled")).toBe("cancelled");
  });
  it("keeps known statuses", () => {
    for (const s of ["trialing", "active", "past_due", "paused", "unpaid", "incomplete"]) {
      expect(localSubscriptionStatus(s)).toBe(s);
    }
  });
  it("does not guess an unknown status", () => {
    expect(localSubscriptionStatus("something_new")).toBeNull();
  });
});
