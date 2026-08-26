import { describe, expect, it } from "vitest";
import { isFreeReviewActive } from "@/lib/config/promo";

describe("free review expiry", () => {
  it("is active through 1 September 2026", () => {
    expect(isFreeReviewActive(new Date("2026-09-01T23:59:59.999Z"))).toBe(true);
  });

  it("expires automatically on 2 September 2026 UTC", () => {
    expect(isFreeReviewActive(new Date("2026-09-02T00:00:00.000Z"))).toBe(false);
  });
});
