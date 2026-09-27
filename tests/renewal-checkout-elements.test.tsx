import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RenewalCheckoutElements } from "@/components/payments/RenewalCheckoutElements";

vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve(null)) }));
vi.mock("@stripe/react-stripe-js/checkout", () => ({
  CheckoutElementsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  BillingAddressElement: () => <div data-testid="billing-address-element" />,
  PaymentElement: () => <div data-testid="payment-element" />,
  useCheckoutElements: () => ({
    type: "success",
    checkout: { total: { total: { amount: "$7,800.00" } }, canConfirm: false }
  })
}));

describe.each([
  ["ru", "Платёжный адрес", "Оплатить сейчас"],
  ["en", "Billing address", "Pay now"]
] as const)("renewal Checkout Elements in %s", (locale, addressLabel, payLabel) => {
  it("collects the billing address required by the Checkout Session", () => {
    const html = renderToStaticMarkup(
      <RenewalCheckoutElements
        clientSecret="test-client-secret"
        publishableKey="pk_test_example"
        sessionId="cs_test_example"
        months={6}
        locale={locale}
        onBack={() => {}}
      />
    );

    expect(html).toContain(addressLabel);
    expect(html).toContain('data-testid="billing-address-element"');
    expect(html).toContain('data-testid="payment-element"');
    expect(html.indexOf('data-testid="billing-address-element"')).toBeLessThan(html.indexOf('data-testid="payment-element"'));
    expect(html).toContain(payLabel);
    expect(html).toContain("disabled");
  });
});
