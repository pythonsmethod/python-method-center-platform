import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { PaymentPlans } from "@/components/payments/PaymentPlans";
import { getTestAccessPlan } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Reachable by direct link only: it is not in the navigation and not in
// the payment page. Testers get the address personally.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

function withClientReference(
  url: string | null,
  profileId: string | null
): string | null {
  if (!url || !profileId) {
    return url;
  }

  const target = new URL(url);
  target.searchParams.set("client_reference_id", profileId);
  return target.toString();
}

export default async function TestPaymentPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).paymentTest;
  const payment = getDictionary(locale).payment;

  let profileId: string | null = null;
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    profileId = user?.id ?? null;
  }

  const plan = getTestAccessPlan(locale);
  const plans = plan
    ? [{ ...plan, paymentLinkUrl: withClientReference(plan.paymentLinkUrl, profileId) }]
    : [];

  return (
    <div className="page-shell">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      {plans.length === 0 ? (
        <p className="form-message form-message--error">{t.unavailable}</p>
      ) : null}

      <PaymentPlans
        labels={{
          planLabel: payment.planLabel,
          payButton: payment.payButton,
          unavailable: t.unavailable,
          startCheckbox: payment.startCheckbox,
          offerCheckboxPrefix: payment.offerCheckboxPrefix,
          offerCheckboxLink: payment.offerCheckboxLink,
          offerHint: payment.offerHint,
          refundLink: payment.refundLink,
          signInToPay: payment.signInToPay,
          signInWhy: payment.signInWhy
        }}
        plans={plans}
        signInHref="/login?mode=signup&next=/payment/test"
        signedIn={Boolean(profileId)}
      />

      <section className="panel-grid" aria-label={t.howLabel}>
        <div className="panel">
          <span className="panel__label">{t.howLabel}</span>
          <h2>{t.howTitle}</h2>
          <p>{t.howText}</p>
        </div>
        <div className="panel">
          <span className="panel__label">{t.noticeLabel}</span>
          <h2>{t.noticeTitle}</h2>
          <p>{t.noticeText}</p>
        </div>
      </section>
    </div>
  );
}
