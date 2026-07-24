import { describe, expect, it } from "vitest";
import {
  auditActionLabels,
  caseStatusLabels,
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
      "case_state_updated",
      "support_request_created",
      "support_request_status_changed"
    ]) {
      expect(auditActionLabels[action], action).toBeTruthy();
    }
  });

  it("covers every lifecycle event type and case status", () => {
    for (const event of [
      "case_created",
      "onboarding_submitted",
      "status_changed",
      "payment_recorded",
      "service_period_started",
      "service_period_completed",
      "support_requested",
      "escalation_created",
      "consent_recorded",
      "admin_note_added"
    ]) {
      expect(lifecycleLabels[event], event).toBeTruthy();
    }

    for (const status of [
      "created",
      "awaiting_onboarding",
      "ready_for_review",
      "in_review",
      "active_support",
      "inactive_support",
      "completed",
      "archived"
    ]) {
      expect(caseStatusLabels[status], status).toBeTruthy();
    }
  });
});
