import type Stripe from "stripe";

type PeriodItem = Stripe.SubscriptionItem & { current_period_end?: number };

// Stop automatic renewal at the end of the time already paid for.
//
// Stripe's customer portal cannot cancel a subscription that has a schedule
// with a future phase, and every PMC renewal subscription has one (it switches
// the N-period first price to the 30-day renewal price). So the cabinet does
// it directly: shorten the schedule to the current phase and let it cancel.
// Nothing is refunded and no paid time is removed.
export async function stopRenewalAtPeriodEnd(stripe: Stripe, subscriptionId: string): Promise<Date> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["schedule"] });
  if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
    throw new Error("subscription already ended");
  }
  const item = subscription.items.data[0] as PeriodItem | undefined;
  const periodEnd = item?.current_period_end;
  if (!item || !periodEnd) throw new Error("subscription paid period unavailable");

  const schedule = subscription.schedule && typeof subscription.schedule !== "string"
    ? subscription.schedule : null;

  if (schedule && (schedule.status === "active" || schedule.status === "not_started")) {
    const phaseStart = schedule.current_phase?.start_date;
    if (!phaseStart) throw new Error("schedule current phase unavailable");
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "cancel",
      phases: [{
        start_date: phaseStart,
        end_date: periodEnd,
        items: subscription.items.data.map(existing => ({
          price: typeof existing.price === "string" ? existing.price : existing.price.id,
          quantity: existing.quantity ?? 1
        })),
        proration_behavior: "none"
      }]
    }, { idempotencyKey: `pmc-stop-renewal-${subscriptionId}-${periodEnd}` });
  } else {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true },
      { idempotencyKey: `pmc-stop-renewal-${subscriptionId}-${periodEnd}` });
  }
  return new Date(periodEnd * 1000);
}
