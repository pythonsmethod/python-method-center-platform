import { describe, expect, it } from "vitest";
import { buildCheckoutSession, parseCheckoutInput, requiresCheckoutElements, type CheckoutInput } from "@/lib/payments/checkout-contract";
import { getBillingSettings, getCheckoutElementsPublishableKey, getCheckoutSettings } from "@/lib/payments/checkout-settings";
import { languageSwitchHref } from "@/lib/i18n/routing";

const requestId = "8f4b852e-1111-4222-8333-fbc5515f5dee";
const settings = { origin: "https://staging.example.test", livemode: false, automaticTax: false };
const input: CheckoutInput = { product: "personal_support", months: 1, autoRenew: false, locale: "ru", offerAccepted: true, startAccepted: true, requestId };
const validEnv = { NODE_ENV: "test", STRIPE_CHECKOUT_ENABLED: "true", STRIPE_CHECKOUT_MODE: "test", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_CHECKOUT_RETURN_ORIGIN: settings.origin } as const;

describe.each(["ru", "en"] as const)("Checkout contract in %s", locale => {
  it.each(Array.from({ length: 12 }, (_, i) => i + 1).flatMap(months => [false, true].map(autoRenew => ({ months, autoRenew }))))(
    "$months prepaid periods, renewal=$autoRenew", ({ months, autoRenew }) => {
      const selection = { ...input, months, autoRenew, locale };
      const session = buildCheckoutSession(selection, "account-owner", "cus_owner", { prepaid: "price_1300_once", renewal: "price_1300_30d" }, settings);
      expect(session.locale).toBe(locale);
      expect(session.client_reference_id).toBe("account-owner");
      expect(session.customer).toBe("cus_owner");
      expect(session.line_items?.[0]).toEqual({ price: "price_1300_once", quantity: autoRenew ? 1 : months });
      expect(session.metadata).toMatchObject({ product: "personal_support", months: String(months), auto_renew: String(autoRenew), ui_locale: locale, profile_id: "account-owner" });
      expect(session.automatic_tax).toEqual({ enabled: false });
      expect(session.adaptive_pricing).toEqual({ enabled: false });
      expect(session.integration_identifier).toBe("pmc-checkout-slibjrkn");
      expect(session).not.toHaveProperty("payment_method_types");
      expect(session).not.toHaveProperty("allow_promotion_codes");
      expect(session).not.toHaveProperty("shipping_options");
      const submit = session.custom_text?.submit;
      const copy = submit ? submit.message : "";
      if (!autoRenew || months === 1) {
        expect(copy).toContain(locale === "ru" ? `${months * 30} дней` : `${months * 30} days`);
        expect(copy).toContain(locale === "ru" ? "доставка включена" : "delivery is included");
      }
      if (autoRenew) {
        expect(session.mode).toBe("subscription");
        expect(session.line_items).toHaveLength(1);
        expect(session.subscription_data).not.toHaveProperty("trial_period_days");
        expect(session.subscription_data).not.toHaveProperty("trial_settings");
        expect(session.subscription_data?.metadata).toEqual(session.metadata);
        expect(session.payment_method_collection).toBe("always");
        if (months === 1) expect(copy).toContain(locale === "ru" ? "1,300 USD каждые 30 дней" : "USD 1,300 every 30 days");
      } else {
        expect(session.mode).toBe("payment");
        expect(session.line_items).toHaveLength(1);
        expect(session).not.toHaveProperty("subscription_data");
        expect(session.payment_intent_data).not.toHaveProperty("setup_future_usage");
        expect(session).not.toHaveProperty("invoice_creation");
      }
      if (autoRenew && months > 1) {
        expect(requiresCheckoutElements(selection)).toBe(true);
        expect(session.ui_mode).toBe("elements");
        expect(session.return_url).toBe(`${settings.origin}${locale === "en" ? "/en" : ""}/payment/success?session_id={CHECKOUT_SESSION_ID}`);
        expect(session).not.toHaveProperty("success_url");
        expect(session).not.toHaveProperty("cancel_url");
      } else {
        expect(requiresCheckoutElements(selection)).toBe(false);
        expect(session.cancel_url).toBe(`${settings.origin}${locale === "en" ? "/en" : ""}/payment`);
        expect(session.success_url).toBe(`${settings.origin}${locale === "en" ? "/en" : ""}/payment/success?session_id={CHECKOUT_SESSION_ID}`);
      }
    }
  );
  it("charges the assessment once without a support term or renewal", () => {
    const session = buildCheckoutSession({ ...input, product: "preliminary_assessment", locale }, "owner", "cus_owner", { prepaid: "price_299" }, settings);
    expect(session.line_items).toEqual([{ price: "price_299", quantity: 1 }]);
    expect(session.mode).toBe("payment");
    expect(session.custom_text?.submit).toMatchObject({ message: expect.stringContaining("299") });
    expect(session).not.toHaveProperty("subscription_data");
  });
});

describe("untrusted checkout selection", () => {
  it.each([
    { months: 0 }, { months: 13 }, { months: -1 }, { months: 1.5 }, { months: "2" }, { months: NaN },
    { autoRenew: "true" }, { autoRenew: undefined }, { locale: "auto" },
    { product: "support_5_weeks" }, { product: "support_15_weeks" },
    { product: "preliminary_assessment", autoRenew: true }, { product: "preliminary_assessment", months: 2 },
    { offerAccepted: false }, { startAccepted: false }, { requestId: "not-a-uuid" },
    { amount: 1 }, { customer: "cus_somebody_else" }, { client_reference_id: "somebody_else" }, { return_url: "https://attacker.test" }
  ])("rejects %j before Stripe", patch => expect(parseCheckoutInput({ ...input, ...patch })).toBeNull());
  it("normalizes field order for stable retry identity", () => {
    const reversed = Object.fromEntries(Object.entries(input).reverse());
    expect(JSON.stringify(parseCheckoutInput(reversed))).toBe(JSON.stringify(parseCheckoutInput(input)));
  });
  it("preserves the payment route when switching languages both ways", () => {
    expect(languageSwitchHref({ pathname: "/payment", search: "?from=pricing", hash: "" }, "en")).toBe("/en/payment?from=pricing");
    expect(languageSwitchHref({ pathname: "/en/payment", search: "?from=pricing", hash: "" }, "ru")).toBe("/payment?from=pricing");
  });
});

describe("environment boundary", () => {
  it("requires a feature flag, explicit return origin, webhook and matching key mode", () => {
    expect(getCheckoutSettings(validEnv)).toEqual(settings);
    for (const patch of [
      { STRIPE_CHECKOUT_ENABLED: "false" }, { STRIPE_WEBHOOK_SECRET: "" }, { STRIPE_CHECKOUT_RETURN_ORIGIN: "" },
      { STRIPE_CHECKOUT_RETURN_ORIGIN: "https://example.test/redirect" }, { STRIPE_CHECKOUT_RETURN_ORIGIN: "http://public.test" },
      { STRIPE_CHECKOUT_RETURN_ORIGIN: "https://user:password@example.test" }, { STRIPE_SECRET_KEY: "sk_live_fixture" },
      { STRIPE_CHECKOUT_MODE: "something-else" }
    ]) expect(getCheckoutSettings({ ...validEnv, ...patch })).toBeNull();
  });
  it("refuses live keys in a preview even when its production flag is copied", () => {
    const live = { ...validEnv, STRIPE_SECRET_KEY: "sk_live_fixture", STRIPE_CHECKOUT_MODE: "live", NODE_ENV: "production" as const };
    expect(getCheckoutSettings({ ...live, VERCEL_ENV: "preview" })).toBeNull();
    expect(getCheckoutSettings({ ...live, VERCEL_ENV: "production" })?.livemode).toBe(true);
  });
  it("keeps portal cancellation available with new sales disabled", () => {
    expect(getBillingSettings({ ...validEnv, STRIPE_CHECKOUT_ENABLED: "false" })).toEqual(settings);
  });
  it("never gives an Elements session a publishable key from the other mode", () => {
    const testKey = "pk_test_abcdefghijklmnopqrstuvwxyz";
    const liveKey = "pk_live_abcdefghijklmnopqrstuvwxyz";
    expect(getCheckoutElementsPublishableKey(false, { NODE_ENV: "test", STRIPE_PUBLISHABLE_KEY: testKey })).toBe(testKey);
    expect(getCheckoutElementsPublishableKey(true, { NODE_ENV: "test", STRIPE_PUBLISHABLE_KEY: testKey })).toBeNull();
    expect(getCheckoutElementsPublishableKey(true, { NODE_ENV: "test", STRIPE_PUBLISHABLE_KEY: liveKey })).toBe(liveKey);
    expect(getCheckoutElementsPublishableKey(false, { NODE_ENV: "test", STRIPE_PUBLISHABLE_KEY: liveKey })).toBeNull();
  });
});
