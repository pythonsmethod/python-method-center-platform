import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";

const mocks = vi.hoisted(() => ({
  client: vi.fn(),
  notify: vi.fn(),
  openPeriod: vi.fn(),
  recordFailure: vi.fn(),
  releaseEvent: vi.fn()
}));

vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.client }));
vi.mock("@/lib/notifications/notify", () => ({
  adminLink: (path: string) => path,
  notifyTeam: mocks.notify
}));
vi.mock("@/lib/payments/service-period", () => ({ openServicePeriod: mocks.openPeriod }));
vi.mock("@/lib/payments/stripe", async original => ({
  ...await original<typeof import("@/lib/payments/stripe")>(),
  getStripe: () => new Stripe("sk_test_synthetic_route")
}));

const secret = "whsec_synthetic_failed_renewal";
const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;

function db() {
  return {
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          insert: async () => ({ error: null }),
          delete: () => ({ eq: mocks.releaseEvent })
        };
      }
      if (table === "billing_subscriptions") {
        return { update: () => ({ eq: mocks.recordFailure }) };
      }
      throw new Error(`unexpected table ${table}`);
    }
  };
}

function request() {
  const payload = JSON.stringify({
    id: "evt_synthetic_failed_renewal",
    object: "event",
    type: "invoice.payment_failed",
    livemode: false,
    data: {
      object: {
        id: "in_synthetic_failed_renewal",
        object: "invoice",
        subscription: "sub_synthetic_failed_renewal"
      }
    }
  });
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": signature }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  mocks.client.mockImplementation(db);
  mocks.notify.mockResolvedValue(undefined);
  mocks.recordFailure.mockResolvedValue({ error: null });
  mocks.releaseEvent.mockResolvedValue({ error: null });
});

afterEach(() => {
  if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
});

describe("failed renewal webhook", () => {
  it("records past_due without granting an unpaid support period", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.recordFailure).toHaveBeenCalledWith("stripe_subscription_id", "sub_synthetic_failed_renewal");
    expect(mocks.openPeriod).not.toHaveBeenCalled();
    expect(mocks.releaseEvent).not.toHaveBeenCalled();
  });

  it("returns 500 and releases the event claim if the status write fails", async () => {
    mocks.recordFailure.mockResolvedValue({ error: { message: "database unavailable" } });

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "processing-failed" });
    expect(mocks.releaseEvent).toHaveBeenCalledWith("id", "evt_synthetic_failed_renewal");
    expect(mocks.openPeriod).not.toHaveBeenCalled();
  });
});
