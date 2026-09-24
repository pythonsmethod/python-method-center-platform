import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createPaymentCheckout } from "@/lib/payments/actions";
import { POST as portal } from "@/app/api/stripe/portal/route";

const mocks = vi.hoisted(() => ({ supabase: vi.fn(), stripe: vi.fn(), price: vi.fn(), portal: vi.fn(), locale: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.supabase }));
vi.mock("@/lib/payments/stripe", () => ({ getStripe: mocks.stripe }));
vi.mock("@/lib/payments/checkout-catalog", () => ({ ensureCheckoutPrice: mocks.price, ensurePortalConfiguration: mocks.portal }));
vi.mock("@/lib/i18n/locale", () => ({ getLocale: mocks.locale }));

const input = { product: "personal_support", months: 12, autoRenew: true, locale: "en", offerAccepted: true, startAccepted: true, requestId: "8f4b852e-1111-4222-8333-fbc5515f5dee" };
const owner = "8f4b852e-1111-4222-8333-fbc5515f5111";
const origin = "https://staging.example.test";
function database() {
  const billing = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
  };
  const consent = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockResolvedValue({ error: null })
  };
  const periods = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
  };
  const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: owner, email: "synthetic@example.test" } }, error: null }) };
  const from = vi.fn((table: string) => table === "consent_records" ? consent : table === "service_periods" ? periods : billing);
  return { auth, from, billing, consent, periods };
}
function stripeClient() {
  return {
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_owner" }), update: vi.fn().mockResolvedValue({ id: "cus_owner" }) },
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/fixture", livemode: false }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/fixture" }) } }
  };
}
let db: ReturnType<typeof database>;
let stripe: ReturnType<typeof stripeClient>;
beforeEach(() => {
  vi.clearAllMocks();
  for (const [name, value] of Object.entries({
    STRIPE_CHECKOUT_ENABLED: "true", STRIPE_CHECKOUT_MODE: "test", STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_CHECKOUT_RETURN_ORIGIN: origin
  })) vi.stubEnv(name, value);
  db = database(); stripe = stripeClient();
  mocks.supabase.mockResolvedValue(db); mocks.stripe.mockReturnValue(stripe);
  mocks.price.mockImplementation(async (_stripe, kind) => `price_${kind}`);
  mocks.portal.mockResolvedValue("bpc_fixture"); mocks.locale.mockResolvedValue("en");
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated checkout action", () => {
  it("binds the owner on the server, stores two exact consents and requests the selected language", async () => {
    await expect(createPaymentCheckout(input)).resolves.toEqual({ url: "https://checkout.stripe.com/fixture" });
    expect(db.billing.eq).toHaveBeenCalledWith("profile_id", owner);
    expect(db.consent.insert).toHaveBeenCalledWith([
      expect.objectContaining({ profile_id: owner, source: "payment_page", metadata: expect.objectContaining({ months: 12, auto_renew: true, ui_locale: "en", immediate_start: false }) }),
      expect.objectContaining({ profile_id: owner, source: "payment_immediate_start", metadata: expect.objectContaining({ immediate_start: true }) })
    ]);
    expect(db.consent.insert.mock.invocationCallOrder[0]).toBeLessThan(stripe.checkout.sessions.create.mock.invocationCallOrder[0]);
    expect(stripe.customers.create).toHaveBeenCalledWith(expect.objectContaining({ preferred_locales: ["en"], metadata: { profile_id: owner } }), expect.anything());
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      client_reference_id: owner, customer: "cus_owner", locale: "en", mode: "subscription",
      line_items: [{ price: "price_prepaid-renewal", quantity: 1 }],
      subscription_data: expect.not.objectContaining({ trial_period_days: expect.anything() })
    }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
    expect(mocks.price).toHaveBeenCalledWith(stripe, "prepaid-renewal", "en", 12);
  });
  it("uses stable Stripe idempotency keys on a network retry", async () => {
    await createPaymentCheckout(input);
    await createPaymentCheckout(Object.fromEntries(Object.entries(input).reverse()));
    expect(stripe.customers.create.mock.calls[0]).toEqual(stripe.customers.create.mock.calls[1]);
    expect(stripe.checkout.sessions.create.mock.calls[0]).toEqual(stripe.checkout.sessions.create.mock.calls[1]);
  });
  it("does not recreate consents already recorded for this attempt", async () => {
    db.consent.contains.mockResolvedValue({ data: [{ source: "payment_page" }, { source: "payment_immediate_start" }], error: null });
    await createPaymentCheckout(input);
    expect(db.consent.insert).not.toHaveBeenCalled();
  });
  it("does not set up renewal for a prepaid-only selection", async () => {
    await createPaymentCheckout({ ...input, autoRenew: false });
    expect(mocks.portal).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create.mock.calls[0][0]).not.toHaveProperty("subscription_data");
    expect(db.consent.insert.mock.calls[0][0][0].metadata.auto_renew).toBe(false);
  });
  it("refuses a guest before creating a catalog, customer or session", async () => {
    db.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(createPaymentCheckout(input)).resolves.toEqual({ error: "signin" });
    expect(db.from).not.toHaveBeenCalled();
    expect(mocks.price).not.toHaveBeenCalled();
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });
  it("refuses missing billing migration before Stripe writes", async () => {
    db.billing.maybeSingle.mockResolvedValue({ data: null, error: { message: "table missing" } });
    await expect(createPaymentCheckout(input)).resolves.toEqual({ error: "unavailable" });
    expect(mocks.price).not.toHaveBeenCalled();
  });
  it("does not charge if consent could not be saved", async () => {
    db.consent.insert.mockResolvedValue({ error: { message: "write refused" } });
    await expect(createPaymentCheckout(input)).resolves.toEqual({ error: "consent" });
    expect(mocks.price).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("does not create another renewal for an account with an existing subscription", async () => {
    db.billing.maybeSingle.mockResolvedValue({ data: { stripe_customer_id: "cus_owner", status: "active" }, error: null });
    await expect(createPaymentCheckout(input)).resolves.toEqual({ error: "subscription-exists" });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("does not start a renewing subscription during existing paid support", async () => {
    db.periods.maybeSingle.mockResolvedValue({ data: { id: "paid-period" }, error: null });
    await expect(createPaymentCheckout(input)).resolves.toEqual({ error: "period-active" });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it("rejects tampered ownership, amount or legacy product before any side effect", async () => {
    for (const patch of [{ amount: 1 }, { customer: "cus_victim" }, { product: "support_5_weeks" }, { offerAccepted: false }]) {
      await expect(createPaymentCheckout({ ...input, ...patch })).resolves.toEqual({ error: "invalid" });
    }
    expect(mocks.supabase).not.toHaveBeenCalled();
    expect(mocks.stripe).not.toHaveBeenCalled();
  });
  it("does not leak Stripe error details", async () => {
    stripe.checkout.sessions.create.mockRejectedValue(new Error("sensitive processor response"));
    await expect(createPaymentCheckout(input)).resolves.toEqual({ error: "unavailable" });
  });
  it("does not start payment when checkout is disabled", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "false");
    await expect(createPaymentCheckout(input)).resolves.toEqual({ error: "unavailable" });
    expect(mocks.supabase).not.toHaveBeenCalled();
  });
});

describe("localized customer portal", () => {
  const request = (requestOrigin: string | null = origin) => new Request(`${origin}/api/stripe/portal`, { method: "POST", headers: requestOrigin ? { origin: requestOrigin } : {} });
  it.each([null, "https://attacker.test"])("rejects a cross-site POST from %s", async value => {
    expect((await portal(request(value))).status).toBe(403);
    expect(mocks.supabase).not.toHaveBeenCalled();
  });
  it("requires login", async () => {
    db.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await portal(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?");
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });
  it("selects the authenticated account's customer and locale, even when sales are disabled", async () => {
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "false");
    db.billing.maybeSingle.mockResolvedValue({ data: { stripe_customer_id: "cus_owner", status: "trialing" }, error: null });
    const response = await portal(request());
    expect(db.billing.eq).toHaveBeenCalledWith("profile_id", owner);
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({ customer: "cus_owner", configuration: "bpc_fixture", locale: "en", return_url: `${origin}/cabinet/account` });
    expect(response.headers.get("location")).toBe("https://billing.stripe.com/fixture");
  });
});
