// Launch promo: Karen's personal analyses review is free for early
// clients. After the deadline the site stops advertising the promotion;
// it does not publish or promise a future stand-alone price.
//
// Switch WITHOUT code changes: set NEXT_PUBLIC_FREE_REVIEW=off in Vercel
// (plus Redeploy) to remove the active offer from the site and assistant.
// The promo has an end date, and saying it out loud is the point: a gift
// with no deadline reads as a trick. One source for the site copy, the
// English copy and the assistant, so the three can never drift apart.
export const FREE_REVIEW_DEADLINE_RU = "1 сентября 2026 года";
export const FREE_REVIEW_DEADLINE_EN = "1 September 2026";

// How long the review takes, and how long questions stay open afterwards.
export const REVIEW_WORKING_DAYS = 3;

export function isFreeReviewActive(): boolean {
  return process.env.NEXT_PUBLIC_FREE_REVIEW?.trim().toLowerCase() !== "off";
}
