import Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/stripe-webhook/route";

const originalSecretKey = process.env.STRIPE_SECRET_KEY;
const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

afterEach(() => {
  restoreEnv("STRIPE_SECRET_KEY", originalSecretKey);
  restoreEnv("STRIPE_WEBHOOK_SECRET", originalWebhookSecret);
});

describe("POST /stripe-webhook", () => {
  it("fails closed when STRIPE_WEBHOOK_SECRET is absent", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_route_check";
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const response = await POST(request("{}"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "stripe-not-configured" });
  });

  it("rejects an invalid Stripe signature", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_route_check";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_route_check";

    const response = await POST(request("{}", "t=1,v1=invalid"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid-signature" });
  });

  it("accepts a signature made with STRIPE_WEBHOOK_SECRET", async () => {
    const payload = JSON.stringify({
      id: "evt_route_check",
      object: "event",
      type: "route.check",
      data: { object: {} }
    });
    const secret = "whsec_route_check";
    process.env.STRIPE_SECRET_KEY = "sk_test_route_check";
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret
    });

    const response = await POST(request(payload, signature));

    // No Supabase env is supplied in this unit test. Reaching this response
    // proves signature verification succeeded and processing continued.
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "service-unavailable" });
  });
});

function request(body: string, signature?: string): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature) headers.set("stripe-signature", signature);

  return new Request("http://localhost/stripe-webhook", {
    method: "POST",
    headers,
    body
  });
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
