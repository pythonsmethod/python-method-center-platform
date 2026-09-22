import type Stripe from "stripe";
import type { Locale } from "@/lib/i18n/locale";
import { localizedHref } from "@/lib/i18n/routing";
import { OFFER_VERSION } from "@/lib/legal/offer";
import {
  PERSONAL_SUPPORT_PRODUCT, PERSONAL_SUPPORT_MONTHLY_USD,
  PERSONAL_SUPPORT_PERIOD_DAYS, PERSONAL_SUPPORT_MAX_MONTHS,
  REVIEW_PRODUCT, REVIEW_TOTAL_USD
} from "@/lib/payments/config";
import type { CheckoutSettings } from "@/lib/payments/checkout-settings";

export const CHECKOUT_VERSION = "pmc-20260922-v1";
export const STRIPE_INTEGRATION_IDENTIFIER = "pmc-checkout-slibjrkn";
export type CheckoutProduct = typeof REVIEW_PRODUCT | typeof PERSONAL_SUPPORT_PRODUCT;
export type CheckoutInput = {
  product: CheckoutProduct;
  months: number;
  autoRenew: boolean;
  locale: Locale;
  offerAccepted: true;
  startAccepted: true;
  requestId: string;
};
export type CheckoutError = "invalid" | "signin" | "unavailable" | "consent" | "subscription-exists";
export type CheckoutResult = { url: string } | { error: CheckoutError };

export function parseCheckoutInput(raw: unknown): CheckoutInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (Object.keys(input).some(key => !["product", "months", "autoRenew", "locale", "offerAccepted", "startAccepted", "requestId"].includes(key))) return null;
  if (input.product !== REVIEW_PRODUCT && input.product !== PERSONAL_SUPPORT_PRODUCT) return null;
  if (typeof input.months !== "number" || !Number.isInteger(input.months) || input.months < 1 || input.months > PERSONAL_SUPPORT_MAX_MONTHS) return null;
  if (typeof input.autoRenew !== "boolean" || (input.locale !== "ru" && input.locale !== "en")) return null;
  if (input.product === REVIEW_PRODUCT && (input.months !== 1 || input.autoRenew)) return null;
  if (input.offerAccepted !== true || input.startAccepted !== true) return null;
  if (typeof input.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) return null;
  return {
    product: input.product, months: input.months, autoRenew: input.autoRenew,
    locale: input.locale, offerAccepted: true, startAccepted: true, requestId: input.requestId
  };
}

export function checkoutMetadata(input: CheckoutInput, profileId: string) {
  return {
    product: input.product, months: String(input.months),
    auto_renew: String(input.autoRenew), ui_locale: input.locale,
    profile_id: profileId, checkout_request_id: input.requestId,
    offer_version: OFFER_VERSION, checkout_version: CHECKOUT_VERSION
  };
}

export function buildCheckoutSession(input: CheckoutInput, profileId: string, customerId: string,
  prices: { prepaid: string; renewal?: string }, settings: CheckoutSettings): Stripe.Checkout.SessionCreateParams {
  const support = input.product === PERSONAL_SUPPORT_PRODUCT;
  const days = input.months * PERSONAL_SUPPORT_PERIOD_DAYS;
  const amount = support ? input.months * PERSONAL_SUPPORT_MONTHLY_USD : REVIEW_TOTAL_USD;
  const ru = input.locale === "ru";
  const summary = support
    ? (ru ? `Сегодня: ${amount} USD за ${days} дней. Формула на оплаченный период — в подарок, доставка включена.`
      : `Today: USD ${amount} for ${days} days. Formula for the paid period is complimentary; delivery is included.`)
      + (input.autoRenew
        ? (ru ? ` Затем 1,300 USD каждые 30 дней. Автопродление можно отключить в личном кабинете до следующего списания.`
          : ` Then USD 1,300 every 30 days. You can turn off renewal in your account before the next charge.`)
        : (ru ? " Без автоматического продления." : " No automatic renewal."))
    : (ru ? "Оценка состояния: 299 USD единоразово. Без подписки." : "Condition assessment: USD 299 once. No subscription.");
  const metadata = checkoutMetadata(input, profileId);
  if (input.autoRenew && !prices.renewal) throw new Error("renewal price is required");
  return {
    mode: input.autoRenew ? "subscription" : "payment",
    integration_identifier: STRIPE_INTEGRATION_IDENTIFIER,
    locale: input.locale,
    client_reference_id: profileId,
    customer: customerId,
    customer_update: { address: "auto", name: "auto" },
    billing_address_collection: "required",
    adaptive_pricing: { enabled: false },
    automatic_tax: { enabled: settings.automaticTax },
    metadata,
    line_items: [{ price: prices.prepaid, quantity: input.autoRenew ? 1 : support ? input.months : 1 }],
    ...(input.autoRenew ? {
      payment_method_collection: "always" as const,
      subscription_data: {
        // The first recurring price is the actual paid N×30-day term. After
        // payment the webhook attaches a schedule that changes the next phase
        // to the 30-day renewal price. No paid time is represented as a trial.
        metadata
      }
    } : { payment_intent_data: { metadata } }),
    custom_text: { submit: { message: summary + (settings.automaticTax
      ? (ru ? " Применимые налоги добавляются при оплате." : " Applicable taxes are added at checkout.") : "") } },
    success_url: `${settings.origin}${localizedHref("/payment/success", input.locale)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${settings.origin}${localizedHref("/payment", input.locale)}`
  };
}
