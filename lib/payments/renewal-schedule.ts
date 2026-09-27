import type Stripe from "stripe";

type PeriodItem = Stripe.SubscriptionItem & {
  current_period_start?: number;
  current_period_end?: number;
};

export async function ensureThirtyDayRenewalSchedule(
  stripe: Stripe,
  subscriptionId: string,
  renewalPriceId: string
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["schedule"] });
  const item = subscription.items.data[0] as PeriodItem | undefined;
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;
  if (!item || !periodStart || !periodEnd || periodEnd <= periodStart) {
    throw new Error("subscription paid period unavailable");
  }

  const existingScheduleId = subscription.schedule
    ? typeof subscription.schedule === "string" ? subscription.schedule : subscription.schedule.id
    : null;
  const scheduleId = existingScheduleId ?? (await stripe.subscriptionSchedules.create(
      { from_subscription: subscriptionId },
      { idempotencyKey: `pmc-renewal-schedule-${subscriptionId}` }
    )).id;
  await stripe.subscriptionSchedules.update(scheduleId, {
    end_behavior: "release",
    phases: [
      {
        start_date: periodStart,
        end_date: periodEnd,
        items: subscription.items.data.map(existing => ({
          price: typeof existing.price === "string" ? existing.price : existing.price.id,
          quantity: existing.quantity ?? 1
        })),
        proration_behavior: "none"
      },
      {
        start_date: periodEnd,
        end_date: periodEnd + 120 * 30 * 86400,
        items: [{ price: renewalPriceId, quantity: 1 }],
        proration_behavior: "none"
      }
    ]
  });
  return scheduleId;
}
