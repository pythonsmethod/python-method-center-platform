import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";
import { ensureCheckoutPrice, ensurePortalConfiguration } from "@/lib/payments/checkout-catalog";

function catalog() {
  const products = new Map<string, Stripe.Product>();
  const prices = new Map<string, Stripe.Price>();
  const configurations: Stripe.BillingPortal.Configuration[] = [];
  const client = {
    products: {
      retrieve: vi.fn(async (id: string) => { if (!products.has(id)) throw { code: "resource_missing" }; return products.get(id); }),
      create: vi.fn(async (params: Stripe.ProductCreateParams) => {
        const product = { ...params, active: true } as Stripe.Product;
        products.set(product.id, product); return product;
      })
    },
    prices: {
      list: vi.fn(async (params: Stripe.PriceListParams) => ({ data: params.lookup_keys?.flatMap(key => prices.has(key) ? [prices.get(key)] : []) ?? [] })),
      create: vi.fn(async (params: Stripe.PriceCreateParams) => {
        const price = { ...params, id: `price_${prices.size}`, active: true, billing_scheme: "per_unit", recurring: params.recurring ? { ...params.recurring, usage_type: "licensed" } : null } as unknown as Stripe.Price;
        prices.set(params.lookup_key!, price); return price;
      })
    },
    billingPortal: { configurations: {
      list: vi.fn(() => (async function* () { yield* configurations; })()),
      create: vi.fn(async (params: Stripe.BillingPortal.ConfigurationCreateParams) => {
        const config = { ...params, id: "bpc_fixture", active: true } as Stripe.BillingPortal.Configuration;
        configurations.push(config); return config;
      })
    } }
  };
  return { client, stripe: client as unknown as Stripe, products, prices, configurations };
}

describe("automatic Stripe catalog", () => {
  it("reuses four localized products and automatic prices for all terms, with exact USD amounts and periods", async () => {
    const { client, stripe, products, prices } = catalog();
    for (const locale of ["ru", "en"] as const) {
      for (let term = 1; term <= 12; term++) {
        for (const kind of ["assessment", "prepaid", "renewal"] as const) await ensureCheckoutPrice(stripe, kind, locale);
        await ensureCheckoutPrice(stripe, "prepaid-renewal", locale, term);
      }
    }
    expect(products.size).toBe(4);
    expect(prices.size).toBe(30);
    expect(client.products.create).toHaveBeenCalledTimes(4);
    expect(client.prices.create).toHaveBeenCalledTimes(30);
    expect([...prices.values()].filter(p => p.metadata?.checkout_version).length).toBe(30);
    for (const price of prices.values()) {
      expect(price.currency).toBe("usd");
      if (price.recurring) {
        expect(price.recurring.interval).toBe("day");
        expect(price.recurring.usage_type).toBe("licensed");
        expect(price.unit_amount).toBe((price.recurring.interval_count ?? 0) / 30 * 130000);
      }
    }
    const names = [...products.values()].map(p => p.name);
    expect(names.some(n => n.includes("Личное сопровождение"))).toBe(true);
    expect(names.some(n => n.includes("Personal Support"))).toBe(true);
  });
  it.each([
    { unit_amount: 1 }, { currency: "eur" }, { active: false }, { tax_behavior: "inclusive" },
    { recurring: { interval: "month", interval_count: 1, usage_type: "licensed" } },
    { product: "unrelated" }
  ])("refuses modified prices without replacing historical objects: %j", async patch => {
    const { stripe, prices, client } = catalog();
    await ensureCheckoutPrice(stripe, "renewal", "ru");
    Object.assign([...prices.values()][0], patch);
    await expect(ensureCheckoutPrice(stripe, "renewal", "ru")).rejects.toThrow("price mismatch");
    expect(client.prices.create).toHaveBeenCalledTimes(1);
  });
  it("creates a reusable portal with end-of-period cancellation and no plan changes", async () => {
    const { stripe, client, configurations } = catalog();
    const id = await ensurePortalConfiguration(stripe, "https://staging.example.test", "en");
    expect(await ensurePortalConfiguration(stripe, "https://staging.example.test", "en")).toBe(id);
    expect(client.billingPortal.configurations.create).toHaveBeenCalledTimes(1);
    expect(configurations[0]).toMatchObject({
      business_profile: { terms_of_service_url: "https://staging.example.test/en/legal/offer" },
      features: { subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" }, subscription_update: { enabled: false }, payment_method_update: { enabled: true } }
    });
    configurations[0].features.subscription_update.enabled = true;
    await expect(ensurePortalConfiguration(stripe, "https://staging.example.test", "en")).rejects.toThrow("portal mismatch");
  });
});
