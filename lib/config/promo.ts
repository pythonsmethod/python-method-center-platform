// Launch promo: Karen's personal analyses review is free for early
// clients. Later it becomes a paid stand-alone service ($500, one day of
// questions to Karen included).
//
// Switch WITHOUT code changes: set NEXT_PUBLIC_FREE_REVIEW=off in Vercel
// (plus Redeploy) to flip the site and the AI assistant to the paid offer.
export const PAID_REVIEW_PRICE_USD = 500;

export function isFreeReviewActive(): boolean {
  return process.env.NEXT_PUBLIC_FREE_REVIEW?.trim().toLowerCase() !== "off";
}
