import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { selectAcceptedOfferVersion } from "@/lib/payments/offer-provenance";

const paidAt = new Date("2026-09-01T12:00:00Z");
const row = (overrides: Partial<{ id: string; version: string; accepted_at: string; metadata: unknown }> = {}) => ({
  id: "consent-v5", version: "oferta-v5", accepted_at: "2026-09-01T10:00:00Z",
  metadata: { product: "support_5_weeks" }, ...overrides
});

describe("Stripe offer-acceptance provenance", () => {
  it("uses accepted v5 even when the current site offer is newer", () => {
    expect(selectAcceptedOfferVersion([row()], "support_5_weeks", paidAt)?.version).toBe("oferta-v5");
  });
  it("ignores consent after settlement", () => {
    expect(selectAcceptedOfferVersion([row({ accepted_at: "2026-09-01T13:00:00Z" })], "support_5_weeks", paidAt)).toBeNull();
  });
  it("selects the latest matching acceptance before settlement", () => {
    expect(selectAcceptedOfferVersion([row({ id: "v4", version: "oferta-v4", accepted_at: "2026-08-01T10:00:00Z" }), row()], "support_5_weeks", paidAt)?.version).toBe("oferta-v5");
  });
  it("ignores another product", () => {
    expect(selectAcceptedOfferVersion([row()], "support_15_weeks", paidAt)).toBeNull();
  });
  it("returns null for a guest with no consent", () => {
    expect(selectAcceptedOfferVersion([], "support_5_weeks", paidAt)).toBeNull();
  });
  it("fails closed for conflicting latest acceptances", () => {
    expect(selectAcceptedOfferVersion([row(), row({ id: "conflict", version: "oferta-v4" })], "support_5_weeks", paidAt)).toBeNull();
  });

  it("scopes the database lookup to the exact profile and accepted state", () => {
    const source = readFileSync(join(process.cwd(), "lib/payments/offer-provenance.ts"), "utf8");
    expect(source).toContain('.eq("profile_id", profileId)');
    expect(source).toContain('.eq("status", "accepted")');
    expect(source).toContain('.lte("accepted_at", paidAt.toISOString())');
  });

  it("creates one reconciliation gate without weakening payment idempotency", () => {
    const source = readFileSync(join(process.cwd(), "app/api/stripe/webhook/route.ts"), "utf8");
    expect(source).toContain('offer_version: offerProvenance?.version ?? null');
    expect(source).toContain('onConflict: "stripe_event_id"');
    expect(source).toContain("REQUIRES_OWNER_IDENTIFICATION");
    expect(source).toContain('if (paymentError.code === "23505")');
    expect(source).toContain("await openServicePeriod");
  });
});
