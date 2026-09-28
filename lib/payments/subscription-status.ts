// Stripe status → our status. incomplete_expired means the first payment
// never succeeded, so it is a dead subscription, not an active one. Anything
// unknown is left untouched instead of being guessed as "active".
export function localSubscriptionStatus(status: string): string | null {
  switch (status) {
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    case "trialing":
    case "active":
    case "past_due":
    case "paused":
    case "unpaid":
    case "incomplete":
      return status;
    default:
      return null;
  }
}
