import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { ensureThirtyDayRenewalSchedule } from "@/lib/payments/renewal-schedule";

function client(schedule: string | null = null) {
  const subscription = {
    id: "sub_paid",
    schedule,
    items: { data: [{ price: { id: "price_initial_6m" }, quantity: 1, current_period_start: 1000, current_period_end: 1000 + 180 * 86400 }] }
  };
  const stripe = {
    subscriptions: { retrieve: vi.fn().mockResolvedValue(subscription) },
    subscriptionSchedules: {
      create: vi.fn().mockResolvedValue({ id: "sub_sched_paid" }),
      update: vi.fn().mockResolvedValue({ id: "sub_sched_paid" })
    }
  };
  return { stripe: stripe as unknown as Stripe, raw: stripe };
}

describe("paid-term renewal schedule", () => {
  it("keeps the paid term and changes only the following phase to 30-day renewal", async () => {
    const { stripe, raw } = client();
    await expect(ensureThirtyDayRenewalSchedule(stripe, "sub_paid", "price_renewal_30d")).resolves.toBe("sub_sched_paid");
    expect(raw.subscriptionSchedules.create).toHaveBeenCalledWith(
      { from_subscription: "sub_paid" }, { idempotencyKey: "pmc-renewal-schedule-sub_paid" }
    );
    expect(raw.subscriptionSchedules.update).toHaveBeenCalledWith("sub_sched_paid", expect.objectContaining({
      end_behavior: "release",
      phases: [
        expect.objectContaining({ start_date: 1000, end_date: 1000 + 180 * 86400, items: [{ price: "price_initial_6m", quantity: 1 }] }),
        expect.objectContaining({ start_date: 1000 + 180 * 86400, end_date: 1000 + 180 * 86400 + 120 * 30 * 86400, items: [{ price: "price_renewal_30d", quantity: 1 }] })
      ]
    }));
  });

  it("does not create a second schedule and reasserts the phases on webhook redelivery", async () => {
    const { stripe, raw } = client("sub_sched_existing");
    await expect(ensureThirtyDayRenewalSchedule(stripe, "sub_paid", "price_renewal_30d")).resolves.toBe("sub_sched_existing");
    expect(raw.subscriptionSchedules.create).not.toHaveBeenCalled();
    expect(raw.subscriptionSchedules.update).toHaveBeenCalledWith("sub_sched_existing", expect.anything());
  });

  it("fails closed when Stripe does not return the paid period", async () => {
    const { stripe, raw } = client();
    raw.subscriptions.retrieve.mockResolvedValue({ id: "sub_paid", schedule: null, items: { data: [] } });
    await expect(ensureThirtyDayRenewalSchedule(stripe, "sub_paid", "price_renewal_30d")).rejects.toThrow("paid period unavailable");
  });
});
