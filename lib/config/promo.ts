// Launch promo: Karen's personal analyses review is free for early
// clients. Later it becomes a paid stand-alone service ($1,000; three
// working days of open chat for questions — same terms as the promo, so
// the offer never gets worse after the switch).
//
// Switch WITHOUT code changes: set NEXT_PUBLIC_FREE_REVIEW=off in Vercel
// (plus Redeploy) to flip the site and the AI assistant to the paid offer.
export const PAID_REVIEW_PRICE_USD = 1000;

// Display form used in copy: "$1 000".
export const PAID_REVIEW_PRICE_LABEL = "$1 000";

// The promo has an end date, and saying it out loud is the point: a gift
// with no deadline reads as a trick. One source for the site copy, the
// English copy and the assistant, so the three can never drift apart.
export const FREE_REVIEW_DEADLINE_RU = "1 октября 2026 года";
export const FREE_REVIEW_DEADLINE_EN = "1 October 2026";

// How long the review takes, and how long questions stay open afterwards.
export const REVIEW_WORKING_DAYS = 3;

export function isFreeReviewActive(): boolean {
  return process.env.NEXT_PUBLIC_FREE_REVIEW?.trim().toLowerCase() !== "off";
}
