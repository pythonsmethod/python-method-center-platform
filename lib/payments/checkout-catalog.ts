import { createHash } from "node:crypto";
import type Stripe from "stripe";
import type { Locale } from "@/lib/i18n/locale";
import { localizedHref } from "@/lib/i18n/routing";
import { getPaymentPlans, REVIEW_TOTAL_USD, PERSONAL_SUPPORT_MONTHLY_USD } from "@/lib/payments/config";
import { CHECKOUT_VERSION, type CheckoutProduct } from "@/lib/payments/checkout-contract";

type PriceKind = "assessment" | "prepaid" | "renewal" | "prepaid-renewal";

// Four localized products cover all combinations. One recurring initial price
// per 1..12 term makes Stripe show paid time as paid rather than as a trial.
// Product/lookup identifiers are stable; retries never edit the old catalog.
export async function ensureCheckoutPrice(stripe: Stripe, kind: PriceKind, locale: Locale, months = 1) {
  if (!Number.isInteger(months) || months < 1 || months > 12) throw new Error("checkout months mismatch");
  const product: CheckoutProduct = kind === "assessment" ? "preliminary_assessment" : "personal_support";
  const productId = `${CHECKOUT_VERSION}-${product}-${locale}`;
  const initialRenewal = kind === "prepaid-renewal";
  const lookupKey = `${CHECKOUT_VERSION}-${kind}-${initialRenewal ? `${months}m-` : ""}${locale}`;
  const amount = (kind === "assessment" ? REVIEW_TOTAL_USD : PERSONAL_SUPPORT_MONTHLY_USD * (initialRenewal ? months : 1)) * 100;
  const plan = getPaymentPlans(locale).find(item => item.product === product)!;
  const metadata = { checkout_version: CHECKOUT_VERSION, product, ui_locale: locale };
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  let catalogProduct: Stripe.Product;
  try {
    catalogProduct = await stripe.products.retrieve(productId);
  } catch (error) {
    if ((error as { code?: string }).code !== "resource_missing") throw error;
    catalogProduct = await stripe.products.create({ id: productId, name: plan.title, description: plan.description, metadata },
      { idempotencyKey: productId });
  }
  if (!catalogProduct.active || catalogProduct.name !== plan.title || catalogProduct.description !== plan.description ||
      catalogProduct.metadata.checkout_version !== CHECKOUT_VERSION) throw new Error("checkout product mismatch");
  const price = data[0] ?? await stripe.prices.create({
    currency: "usd", unit_amount: amount, product: productId, lookup_key: lookupKey,
    tax_behavior: "exclusive", metadata,
    ...(kind === "renewal" || initialRenewal
      ? { recurring: { interval: "day" as const, interval_count: 30 * (initialRenewal ? months : 1) } }
      : {})
  }, { idempotencyKey: lookupKey });
  const recurring = price.recurring;
  if (!price.active || price.currency !== "usd" || price.unit_amount !== amount || price.product !== productId ||
      price.tax_behavior !== "exclusive" || price.billing_scheme !== "per_unit" ||
      (kind === "renewal" || initialRenewal
        ? !recurring || recurring.interval !== "day" || recurring.interval_count !== 30 * (initialRenewal ? months : 1) || recurring.usage_type !== "licensed"
        : recurring !== null)) {
    throw new Error("checkout price mismatch");
  }
  return price.id;
}

export async function ensurePortalConfiguration(stripe: Stripe, origin: string, locale: Locale) {
  const key = `${CHECKOUT_VERSION}-portal-${createHash("sha256").update(`${origin}:${locale}`).digest("hex").slice(0, 24)}`;
  for await (const configuration of stripe.billingPortal.configurations.list({ limit: 100 })) {
    if (configuration.metadata?.checkout_key !== key) continue;
    const features = configuration.features;
    if (!configuration.active || !features.payment_method_update.enabled || !features.invoice_history.enabled ||
        !features.subscription_cancel.enabled || features.subscription_cancel.mode !== "at_period_end" ||
        features.subscription_update.enabled) throw new Error("checkout portal mismatch");
    return configuration.id;
  }
  const configuration = await stripe.billingPortal.configurations.create({
    name: `${CHECKOUT_VERSION} ${locale}`,
    metadata: { checkout_key: key },
    default_return_url: `${origin}/cabinet/account`,
    business_profile: {
      privacy_policy_url: `${origin}${localizedHref("/legal/privacy", locale)}`,
      terms_of_service_url: `${origin}${localizedHref("/legal/offer", locale)}`
    },
    features: {
      payment_method_update: { enabled: true }, invoice_history: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" },
      subscription_update: { enabled: false }
    }
  }, { idempotencyKey: key });
  return configuration.id;
}
