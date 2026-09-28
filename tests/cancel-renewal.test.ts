import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { stopRenewalAtPeriodEnd } from "@/lib/payments/cancel-renewal";
import { ensureThirtyDayRenewalSchedule } from "@/lib/payments/renewal-schedule";

const periodStart = 1_790_000_000;
const periodEnd = periodStart + 180 * 86_400;

function stripe(schedule: Record<string, unknown> | null, extra: Record<string, unknown> = {}) {
  const client = {
    subscriptions: {
      retrieve: vi.fn(async () => ({
        id: "sub_1", status: "active", schedule,
        items: { data: [{ price: { id: "price_6m" }, quantity: 1, current_period_start: periodStart, current_period_end: periodEnd }] },
        ...extra
      })),
      update: vi.fn(async () => ({}))
    },
    subscriptionSchedules: { update: vi.fn(async () => ({})), create: vi.fn() }
  };
  return { client, stripe: client as unknown as Stripe };
}

describe("stopRenewalAtPeriodEnd", () => {
  it("cuts the schedule to the paid phase and cancels at its end", async () => {
    const { client, stripe: s } = stripe({ id: "sub_sched_1", status: "active", end_behavior: "release", current_phase: { start_date: periodStart } });
    const endsAt = await stopRenewalAtPeriodEnd(s, "sub_1");
    expect(endsAt).toEqual(new Date(periodEnd * 1000));
    const [id, params] = client.subscriptionSchedules.update.mock.calls[0] as unknown as [string, Stripe.SubscriptionScheduleUpdateParams];
    expect(id).toBe("sub_sched_1");
    expect(params.end_behavior).toBe("cancel");
    expect(params.phases).toHaveLength(1);
    expect(params.phases![0]).toMatchObject({ start_date: periodStart, end_date: periodEnd, items: [{ price: "price_6m", quantity: 1 }] });
    expect(client.subscriptions.update).not.toHaveBeenCalled();
  });
  it("uses cancel at period end when no schedule is attached", async () => {
    const { client, stripe: s } = stripe(null);
    await stopRenewalAtPeriodEnd(s, "sub_1");
    expect(client.subscriptions.update).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true }, expect.anything());
  });
  it("refuses an already ended subscription", async () => {
    const { stripe: s } = stripe(null, { status: "canceled" });
    await expect(stopRenewalAtPeriodEnd(s, "sub_1")).rejects.toThrow("already ended");
  });
});

describe("renewal schedule after the client turned renewal off", () => {
  it("does not switch renewal back on from a late webhook retry", async () => {
    const { client, stripe: s } = stripe({ id: "sub_sched_1", status: "active", end_behavior: "cancel" });
    await ensureThirtyDayRenewalSchedule(s, "sub_1", "price_renewal");
    expect(client.subscriptionSchedules.update).not.toHaveBeenCalled();
  });
  it("leaves a cancel-at-period-end subscription alone", async () => {
    const { client, stripe: s } = stripe(null, { cancel_at_period_end: true });
    await ensureThirtyDayRenewalSchedule(s, "sub_1", "price_renewal");
    expect(client.subscriptionSchedules.create).not.toHaveBeenCalled();
  });
});
