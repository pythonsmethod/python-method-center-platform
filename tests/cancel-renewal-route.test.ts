import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  server: vi.fn(),
  service: vi.fn(),
  stop: vi.fn(),
  notify: vi.fn()
}));

vi.mock("@/lib/payments/checkout-settings", () => ({
  getBillingSettings: () => ({ origin: "https://center.example.test" })
}));
vi.mock("@/lib/payments/cancel-renewal", () => ({ stopRenewalAtPeriodEnd: mocks.stop }));
vi.mock("@/lib/payments/stripe", () => ({ getStripe: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.server }));
vi.mock("@/lib/supabase/service", () => ({ createSupabaseServiceClient: mocks.service }));
vi.mock("@/lib/notifications/notify", () => ({ adminLink: (path: string) => path, notifyTeam: mocks.notify }));

import { POST } from "@/app/api/stripe/cancel-renewal/route";

const origin = "https://center.example.test";
const owner = "11111111-1111-4111-8111-111111111111";

function request(requestOrigin: string | null = origin, body?: string) {
  return new Request(`${origin}/api/stripe/cancel-renewal`, {
    method: "POST",
    headers: requestOrigin ? { origin: requestOrigin, "content-type": "application/json" } : {},
    body
  });
}

function clients(user: { id: string } | null = { id: owner }) {
  const ownerEq = vi.fn();
  const lookup = {
    select: () => lookup,
    eq: (...args: unknown[]) => { ownerEq(...args); return lookup; },
    neq: () => lookup,
    order: () => lookup,
    limit: () => lookup,
    maybeSingle: async () => ({
      data: { id: "billing_1", stripe_subscription_id: "sub_owner", renewal_cancelled_at: null },
      error: null
    })
  };
  const updated = { eq: () => updated, then: (resolve: (value: unknown) => void) => resolve({ error: null }) };
  mocks.server.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: () => lookup
  });
  mocks.service.mockReturnValue({ from: () => ({ update: () => updated }) });
  return { ownerEq };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stop.mockResolvedValue(new Date("2027-03-28T12:00:00Z"));
  mocks.notify.mockResolvedValue(undefined);
  clients();
});

describe("cancel renewal route boundary", () => {
  it.each([null, "https://attacker.example.test"])("rejects a cross-origin POST from %s", async requestOrigin => {
    expect((await POST(request(requestOrigin))).status).toBe(403);
    expect(mocks.server).not.toHaveBeenCalled();
    expect(mocks.stop).not.toHaveBeenCalled();
  });

  it("requires an authenticated account", async () => {
    clients(null);
    const response = await POST(request());
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?next=/cabinet/account");
    expect(mocks.stop).not.toHaveBeenCalled();
  });

  it("uses only the authenticated owner even when the body claims another subscription", async () => {
    const { ownerEq } = clients();
    const response = await POST(request(origin, JSON.stringify({
      profile_id: "attacker", subscription_id: "sub_attacker", extra: "x".repeat(100_000)
    })));
    expect(response.status).toBe(303);
    expect(ownerEq).toHaveBeenCalledWith("profile_id", owner);
    expect(mocks.stop).toHaveBeenCalledWith(expect.anything(), "sub_owner");
    expect(response.headers.get("location")).toContain("renewal=cancelled");
  });
});
