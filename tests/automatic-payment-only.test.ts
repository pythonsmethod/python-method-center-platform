import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("automatic payments only", () => {
  it("removes and disables the manual admin payment entry", () => {
    const casePage = readFileSync(
      "app/(admin)/admin/cases/[caseId]/page.tsx",
      "utf8"
    );
    const actions = readFileSync("lib/cases/staff-actions.ts", "utf8");

    expect(
      existsSync("app/(admin)/admin/cases/[caseId]/PaymentRecordForm.tsx")
    ).toBe(false);
    expect(casePage).not.toContain("PaymentRecordForm");
    expect(casePage).toContain("Автоматические оплаты");
    expect(casePage).toContain("Automatic payments");
    expect(actions).toContain("const MANUAL_PAYMENT_ENTRY_ENABLED = false");
  });

  it("keeps automatic recording, client payment history, questionnaire, and delivery address", () => {
    const stripeWebhook = readFileSync("app/api/stripe/webhook/route.ts", "utf8");
    const account = readFileSync("app/(client)/cabinet/account/page.tsx", "utf8");
    const onboarding = readFileSync("lib/onboarding/actions.ts", "utf8");

    expect(stripeWebhook).toContain('.from("payments")');
    expect(account).toContain("getOwnPayments");
    expect(account).toContain("delivery_address");
    expect(onboarding).toContain('.from("onboarding_submissions")');
  });
});
