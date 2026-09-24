import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";

const mocks = vi.hoisted(() => ({
  client: vi.fn(), ensureCase: vi.fn(), openPeriod: vi.fn(), delivery: vi.fn(),
  notify: vi.fn(), referral: vi.fn(), ledgerDuplicate: false
}));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.client }));
vi.mock("@/lib/cases/ensure-paid-case", () => ({ ensureCaseForPaidProfile: mocks.ensureCase }));
vi.mock("@/lib/payments/service-period", () => ({ openServicePeriod: mocks.openPeriod }));
vi.mock("@/lib/delivery/create-task", () => ({ ensureDeliveryTaskForPayment: mocks.delivery }));
vi.mock("@/lib/notifications/notify", () => ({
  adminLink: (path: string) => path, notifyTeam: mocks.notify
}));
vi.mock("@/lib/tokens/award", () => ({ awardReferralTokensForPayment: mocks.referral }));
vi.mock("@/lib/payments/stripe", async original => ({
  ...await original<typeof import("@/lib/payments/stripe")>(),
  getStripe: () => new Stripe("sk_test_synthetic_route")
}));

const profileId = "fc95c347-3555-44dc-a987-b939e3628456";
const caseId = "1d8b2355-63cf-4956-88e2-75f381f17a73";
const secret = "whsec_synthetic_paid_case";
const beforeSecret = process.env.STRIPE_WEBHOOK_SECRET;

function db() {
  return { from: (table: string) => {
    if (table === "stripe_events") return { insert: async () => ({
      error: mocks.ledgerDuplicate ? { code: "23505" } : null
    }) };
    if (table === "profiles") return { select: () => ({ eq: () => ({
      maybeSingle: async () => ({ data: { id: profileId }, error: null })
    }) }) };
    if (table === "payments") return { insert: (value: Record<string, unknown>) => ({ select: () => ({
      single: async () => ({ data: { id: "payment-1", profile_id: profileId, case_id: value.case_id }, error: null })
    }) }) };
    throw new Error(`unexpected table ${table}`);
  } };
}

function request() {
  const payload = JSON.stringify({
    id: "evt_paid_new_case", object: "event", type: "checkout.session.completed", livemode: false,
    data: { object: {
      id: "cs_test_synthetic", object: "checkout.session", livemode: false,
      client_reference_id: profileId, payment_status: "paid", status: "complete",
      amount_total: 780000, amount_subtotal: 780000, currency: "usd",
      payment_intent: "pi_synthetic_6", customer_details: { email: "synthetic@example.test" },
      metadata: { product: "personal_support", months: "6", auto_renew: "false" }
    } }
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST", body: payload, headers: { "stripe-signature": signature }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ledgerDuplicate = false;
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  mocks.client.mockImplementation(db);
  mocks.ensureCase.mockResolvedValue(caseId);
  mocks.openPeriod.mockResolvedValue({ status: "opened", endsAt: "2027-03-23T19:29:45Z" });
  mocks.delivery.mockResolvedValue({ status: "address-required" });
  mocks.notify.mockResolvedValue(undefined);
  mocks.referral.mockResolvedValue(undefined);
});
afterEach(() => {
  if (beforeSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = beforeSecret;
});

describe("signed paid checkout fulfillment", () => {
  it("creates or reuses the Case and grants six paid periods before intake", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.ensureCase).toHaveBeenCalledWith(expect.anything(), profileId);
    expect(mocks.openPeriod).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      profileId, caseId, paymentId: "payment-1", product: "personal_support", months: 6
    }));
    expect(mocks.delivery).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      paymentId: "payment-1", caseId, months: 6
    }));
  });

  it("does not fulfill a duplicate Stripe event twice", async () => {
    mocks.ledgerDuplicate = true;
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.ensureCase).not.toHaveBeenCalled();
    expect(mocks.openPeriod).not.toHaveBeenCalled();
  });
});
