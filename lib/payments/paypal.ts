// PayPal as a second way to pay, next to the card.
//
// PayPal payments do not reach the Stripe webhook, so they are confirmed
// by a human. Everything here exists to make that human step short: the
// team learns about the payment the moment the person leaves for PayPal,
// and the person is told plainly that access opens after confirmation.

export type PayPalProduct =
  | "support_5_weeks"
  | "support_15_weeks";

const ENV_BY_PRODUCT: Record<PayPalProduct, string> = {
  support_5_weeks: "NEXT_PUBLIC_PAYPAL_LINK_5W",
  support_15_weeks: "NEXT_PUBLIC_PAYPAL_LINK_15W"
};

// Links are read from NEXT_PUBLIC_* on purpose: the payment page renders
// them into the markup, and there is nothing secret about a payment link.
const RAW_LINKS: Record<PayPalProduct, string | undefined> = {
  support_5_weeks: process.env.NEXT_PUBLIC_PAYPAL_LINK_5W,
  support_15_weeks: process.env.NEXT_PUBLIC_PAYPAL_LINK_15W
};

export function paypalEnvName(product: PayPalProduct): string {
  return ENV_BY_PRODUCT[product];
}

export function getPaypalLink(product: string): string | null {
  const raw = RAW_LINKS[product as PayPalProduct]?.trim();

  if (!raw || !raw.startsWith("https://")) {
    return null;
  }

  return raw;
}

export function hasAnyPaypalLink(): boolean {
  return (Object.keys(RAW_LINKS) as PayPalProduct[]).some((product) =>
    Boolean(getPaypalLink(product))
  );
}
