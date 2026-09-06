import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writePaymentReconciliation } from "@/lib/payments/reconciliation";

const input = {
  stripe_event_id: "event-test",
  status: "OTHER_BLOCKED_WITH_EXACT_REASON",
  reason: "Offer provenance is not proven.",
  next_action: "Review merchant evidence."
};

function client(error: null | { code: string; message: string }) {
  return {
    from: () => ({ insert: async () => ({ error }) })
  } as unknown as Pick<SupabaseClient, "from">;
}

describe("durable payment reconciliation writes", () => {
  it("reports a successful insert", async () => {
    await expect(writePaymentReconciliation(client(null), input)).resolves.toEqual({ status: "inserted" });
  });

  it("treats the same event unique conflict as a controlled retry", async () => {
    await expect(writePaymentReconciliation(client({ code: "23505", message: "duplicate" }), input)).resolves.toEqual({ status: "duplicate" });
  });

  it("surfaces and sanitizes a database failure", async () => {
    await expect(writePaymentReconciliation(client({ code: "XX000", message: "token=private unavailable" }), input)).resolves.toEqual({ status: "failed", error: "[redacted] unavailable" });
  });
});
