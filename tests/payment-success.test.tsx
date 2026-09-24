import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentSuccessPage, { generateMetadata } from "@/app/(payment)/payment/success/page";

const mocks = vi.hoisted(() => ({
  getLocale: vi.fn(), supabase: vi.fn(), stripe: vi.fn(), settings: vi.fn(), from: vi.fn()
}));
vi.mock("@/lib/i18n/locale", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/i18n/locale")>(), getLocale: mocks.getLocale
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.supabase }));
vi.mock("@/lib/payments/stripe", () => ({ getStripe: mocks.stripe }));
vi.mock("@/lib/payments/checkout-settings", () => ({ getBillingSettings: mocks.settings }));

const sessionId = "cs_test_abcdefghijklmnopqrstuvwxyz";
const owner = "owner-123";
let retrieve: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLocale.mockResolvedValue("en");
  mocks.settings.mockReturnValue({ livemode: false });
  mocks.supabase.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: owner, is_anonymous: false } } }) },
    from: mocks.from
  });
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) })
  }));
  retrieve = vi.fn().mockResolvedValue({ livemode: false, client_reference_id: owner, status: "complete", payment_status: "paid", payment_intent: "pi_synthetic" });
  mocks.stripe.mockReturnValue({ checkout: { sessions: { retrieve } } });
});

async function render(id?: string) {
  return renderToStaticMarkup(await PaymentSuccessPage({ searchParams: Promise.resolve({ session_id: id }) }));
}

describe("payment return page", () => {
  it("shows success only for a paid Stripe session owned by the signed-in account", async () => {
    expect(await render(sessionId)).toContain("Your payment has been received");
    expect(await render(sessionId)).toContain("access is still being set up");
    expect(retrieve).toHaveBeenCalledWith(sessionId);
  });
  it("shows exact access dates only after the owned payment and service period are recorded", async () => {
    mocks.from.mockImplementation((table: string) => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: table === "payments"
          ? { id: "payment-1", product: "personal_support", status: "paid" }
          : { starts_at: "2026-09-24T19:29:45Z", ends_at: "2027-03-23T19:29:45Z" },
        error: null
      }) }) }) })
    }));
    const html = await render(sessionId);
    expect(html).toContain("Your paid access is active");
    expect(html).toContain("March 23, 2027");
    expect(html).toContain("Add delivery address");
    expect(mocks.from).toHaveBeenCalledWith("service_periods");
  });
  it("does not claim support access for a paid assessment", async () => {
    mocks.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({
        data: { id: "payment-1", product: "preliminary_assessment", status: "paid" }, error: null
      }) }) }) })
    }));
    const html = await render(sessionId);
    expect(html).toContain("Assessment payment recorded");
    expect(html).not.toContain("Your paid access is active");
  });
  it.each([
    { client_reference_id: "somebody-else" }, { status: "open" },
    { payment_status: "unpaid" }, { livemode: true }
  ])("never calls $client_reference_id a successful payment", async patch => {
    retrieve.mockResolvedValue({ livemode: false, client_reference_id: owner, status: "complete", payment_status: "paid", ...patch });
    expect(await render(sessionId)).toContain("Payment not yet confirmed");
  });
  it("does not look up a missing or malformed session ID", async () => {
    expect(await render(undefined)).toContain("Payment not yet confirmed");
    expect(await render("not-a-session")).toContain("Payment not yet confirmed");
    expect(retrieve).not.toHaveBeenCalled();
  });
  it("localizes an unconfirmed return in Russian", async () => {
    mocks.getLocale.mockResolvedValue("ru");
    expect(await render("not-a-session")).toContain("Платёж пока не подтверждён");
  });
  it("keeps browser metadata neutral until the payment is verified", async () => {
    expect(await generateMetadata()).toMatchObject({ title: "Payment status" });
    mocks.getLocale.mockResolvedValue("ru");
    expect(await generateMetadata()).toMatchObject({ title: "Статус оплаты" });
  });
});
