import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";

const mocks = vi.hoisted(() => ({
  client: vi.fn(), notify: vi.fn(), schedule: vi.fn(), price: vi.fn(), period: vi.fn(),
  profileFound: true
}));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.client }));
vi.mock("@/lib/notifications/notify", () => ({ adminLink: (p: string) => p, notifyTeam: mocks.notify }));
vi.mock("@/lib/payments/renewal-schedule", () => ({ ensureThirtyDayRenewalSchedule: mocks.schedule }));
vi.mock("@/lib/payments/checkout-catalog", () => ({ ensureCheckoutPrice: mocks.price }));
vi.mock("@/lib/payments/stripe-invoice-period", () => ({ paidSubscriptionInvoicePeriod: mocks.period }));
vi.mock("@/lib/payments/stripe", async original => {
  const real = new Stripe("sk_test_synthetic_schedule");
  (real.invoices as unknown as { retrieve: unknown }).retrieve = vi.fn().mockResolvedValue({ id: "in_1" });
  return { ...await original<typeof import("@/lib/payments/stripe")>(), getStripe: () => real };
});

const secret = "whsec_synthetic_schedule";
const profileId = "fc95c347-3555-44dc-a987-b939e3628456";

function db() {
  return { from: (table: string) => {
    if (table === "stripe_events") return { insert: async () => ({ error: null }) };
    if (table === "profiles") {
      const found = { data: mocks.profileFound ? { id: profileId } : null, error: null };
      return { select: () => ({ eq: () => ({ maybeSingle: async () => found }),
        ilike: () => ({ maybeSingle: async () => found }) }) };
    }
    throw new Error(`unexpected table ${table}`);
  } };
}

function request(amount: number) {
  const payload = JSON.stringify({
    id: `evt_${amount}_${mocks.profileFound}`, object: "event", type: "checkout.session.completed",
    livemode: false, created: 1790285885,
    data: { object: {
      id: "cs_test_sub", object: "checkout.session", livemode: false,
      client_reference_id: mocks.profileFound ? profileId : null,
      payment_status: "paid", status: "complete", mode: "subscription",
      amount_total: amount, amount_subtotal: amount, currency: "usd",
      subscription: "sub_synthetic", invoice: "in_1", customer: "cus_synthetic",
      customer_details: { email: "nobody@example.test" },
      metadata: { product: "personal_support", months: "6", auto_renew: "true", ui_locale: "ru" }
    } }
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST", body: payload, headers: { "stripe-signature": signature }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  mocks.client.mockImplementation(db);
  mocks.price.mockResolvedValue("price_renewal");
  mocks.schedule.mockResolvedValue("sub_sched_1");
  mocks.period.mockReturnValue({ startsAt: new Date(), endsAt: new Date(Date.now() + 1e9) });
  mocks.notify.mockResolvedValue(undefined);
});

describe("renewal schedule on early exits", () => {
  it("attaches the 30-day schedule even when the amount fails the contract check", async () => {
    mocks.profileFound = true;
    const res = await POST(request(123));
    expect(res.status).toBe(200);
    expect(mocks.schedule).toHaveBeenCalledWith(expect.anything(), "sub_synthetic", "price_renewal");
  });
  it("attaches the 30-day schedule even when the payer is not matched", async () => {
    mocks.profileFound = false;
    const res = await POST(request(780000));
    expect(res.status).toBe(200);
    expect(mocks.schedule).toHaveBeenCalledTimes(1);
  });
});
