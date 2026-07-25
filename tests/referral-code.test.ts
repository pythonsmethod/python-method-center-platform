import { describe, expect, it } from "vitest";
import {
  generateReferralCode,
  normalizeReferralCode,
  referralLink
} from "@/lib/referrals/code";

describe("generateReferralCode", () => {
  it("produces the PM-XXXXXX shape", () => {
    expect(generateReferralCode()).toMatch(/^PM-[2-9A-HJ-NP-TV-Z]{6}$/);
  });

  it("never uses look-alike characters (0 O 1 I L U)", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateReferralCode()).not.toMatch(/[01IOLU]/);
    }
  });

  it("is deterministic when the random source is", () => {
    expect(generateReferralCode(() => 0)).toBe("PM-222222");
  });
});

describe("normalizeReferralCode", () => {
  it("accepts the canonical form", () => {
    expect(normalizeReferralCode("PM-A7K3QX")).toBe("PM-A7K3QX");
  });

  it("repairs what a human might paste", () => {
    expect(normalizeReferralCode("pm-a7k3qx")).toBe("PM-A7K3QX");
    expect(normalizeReferralCode("  A7K3QX ")).toBe("PM-A7K3QX");
    expect(normalizeReferralCode("PM- A7K3QX")).toBe("PM-A7K3QX");
  });

  it("rejects wrong length, empty and look-alike characters", () => {
    expect(normalizeReferralCode("PM-A7K3Q")).toBeNull();
    expect(normalizeReferralCode("PM-A7K3QXX")).toBeNull();
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
    expect(normalizeReferralCode("PM-A0K3QX")).toBeNull();
  });
});

describe("referralLink", () => {
  it("builds a shareable link with the code", () => {
    expect(referralLink("PM-A7K3QX", "https://example.com")).toBe(
      "https://example.com/?ref=PM-A7K3QX"
    );
  });

  it("tolerates a trailing slash in the site url", () => {
    expect(referralLink("PM-A7K3QX", "https://example.com/")).toBe(
      "https://example.com/?ref=PM-A7K3QX"
    );
  });
});
