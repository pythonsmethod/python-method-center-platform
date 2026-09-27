import type { Metadata } from "next";
import { Link } from "@/components/LocaleLink";
import { PageHeader } from "@/components/PageHeader";
import { PaymentPlans } from "@/components/payments/PaymentPlans";
import { getPaymentPlans } from "@/lib/payments/config";
import { getCheckoutSettings } from "@/lib/payments/checkout-settings";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).payment;

  return {
    title: t.title,
    description: t.description
    // Canonical and hreflang are written by the root layout, which is the
    // only place that knows whether this render is the Russian address or
    // the English one. Pinning a canonical here dropped the pair.
  };
}

export default async function PaymentPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.payment;

  let profileId: string | null = null;
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    profileId = user?.id ?? null;
  }

  const plans = getPaymentPlans(locale);

  return (
    <div className="page-shell payment-page">
      {/* Two current services: one-time condition assessment and one
          configurable Personal Support product. Legacy 5-week / 100-day
          products stay in historical records only and never render here. */}
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <PaymentPlans
        labels={{
          planLabel: t.planLabel,
          payButton: t.payButton,
          unavailable: t.unavailable,
          startCheckbox: t.startCheckbox,
          offerCheckboxPrefix: t.offerCheckboxPrefix,
          offerCheckboxLink: t.offerCheckboxLink,
          offerHint: t.offerHint,
          refundLink: t.refundLink,
          signInToPay: t.signInToPay,
          signInWhy: t.signInWhy,
          durationLabel: t.durationLabel,
          durationOption: t.durationOption,
          selectedTotal: t.selectedTotal,
          giftIncluded: t.giftIncluded,
          autoRenewLabel: t.autoRenewLabel,
          autoRenewText: t.autoRenewText,
          checkoutPending: t.checkoutPending,
          checkoutErrors: t.checkoutErrors,
          taxNote: t.taxNote
        }}
        plans={plans}
        locale={locale}
        checkoutEnabled={Boolean(getCheckoutSettings())}
        signInHref="/login?mode=signup&next=/payment"
        signedIn={Boolean(profileId)}
      />

      <section className="panel-grid" aria-label={t.offerLabel}>
        <div className="panel">
          <span className="panel__label">{t.altLabel}</span>
          <h2>{t.altTitle}</h2>
          <p>{t.altText}</p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/payment/other">
              {t.altCta}
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{t.offerLabel}</span>
          <h2>
            <Link href="/legal/offer">{t.offerTitle}</Link>
          </h2>
          <p>{t.offerText}</p>
        </div>
      </section>
    </div>
  );
}
