import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PaymentPlans } from "@/components/payments/PaymentPlans";
import { LocaleProvider } from "@/components/LocaleLink";
import { getPaymentPlans } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
vi.mock("@/lib/payments/actions", () => ({ createPaymentCheckout: vi.fn() }));

describe.each(["ru", "en"] as const)("payment UI in %s", locale => {
  const labels = getDictionary(locale).payment;
  function render(signedIn: boolean, checkoutEnabled = true) {
    return renderToStaticMarkup(<LocaleProvider locale={locale}><PaymentPlans plans={getPaymentPlans(locale)} labels={labels} locale={locale} signedIn={signedIn} checkoutEnabled={checkoutEnabled} /></LocaleProvider>);
  }
  it("offers all twelve terms, optional renewal and two explicit unchecked consents", () => {
    const html = render(true);
    expect(html.match(/<option /g)).toHaveLength(12);
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html).not.toContain("checked=");
    expect(html).toContain(labels.autoRenewText);
    expect(html).toContain(labels.durationLabel);
    expect(html).toContain(`href="${locale === "en" ? "/en" : ""}/legal/offer"`);
    expect(html).toContain("aria-disabled=\"true\"");
    expect(html).not.toContain("buy.stripe.com");
    expect(html).not.toContain("support_5_weeks");
    expect(html).not.toContain("support_15_weeks");
  });
  it("requires registration before payment and reports unavailable checkout truthfully", () => {
    expect(render(false)).toContain(labels.signInToPay);
    expect(render(false)).not.toContain("offer-gate__label");
    expect(render(true, false)).toContain(labels.unavailable);
    for (const message of Object.values(labels.checkoutErrors)) {
      expect(/[А-Яа-я]/.test(message)).toBe(locale === "ru");
    }
  });
  it("shows the Checkout total without promising unconfigured tax calculation", () => {
    expect(render(true)).toContain(labels.taxNote);
    expect(labels.taxNote.toLowerCase()).not.toMatch(/tax|налог/);
  });
});
