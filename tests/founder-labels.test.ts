import { describe, expect, it } from "vitest";
import {
  auditActionLabels,
  formatMoney,
  lifecycleLabels,
  productLabels
} from "@/lib/founder/labels";

describe("formatMoney", () => {
  it("renders USD cents as a readable amount", () => {
    const result = formatMoney(367500);
    expect(result).toContain("$");
    expect(result.replace(/\s| | /g, "")).toContain("3675");
  });

  it("keeps cents when they are present", () => {
    expect(formatMoney(50)).toContain("0,5");
  });

  it("falls back to the currency code for non-USD", () => {
    expect(formatMoney(1000, "EUR")).toContain("EUR");
  });
});

describe("founder labels", () => {
  it("covers every payment product used by the platform", () => {
    expect(productLabels.support_5_weeks).toBeTruthy();
    expect(productLabels.support_15_weeks).toBeTruthy();
  });

  it("covers the audit actions written by the app", () => {
    for (const action of [
      "client_case_created",
      "onboarding_submitted",
      "offer_accepted",
      "consent_captured",
      "document_uploaded",
      "payment_recorded",
      "support_request_created"
    ]) {
      expect(auditActionLabels[action], action).toBeTruthy();
    }
  });

  it("covers every active lifecycle event type", () => {
    for (const event of [
      "case_created",
      "onboarding_submitted",
      "payment_recorded",
      "service_period_started",
      "service_period_completed",
      "support_requested",
      "consent_recorded",
      "admin_note_added"
    ]) {
      expect(lifecycleLabels[event], event).toBeTruthy();
    }

  });
});
