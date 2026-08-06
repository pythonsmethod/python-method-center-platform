import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PaymentPlans } from "@/components/payments/PaymentPlans";
import { getPaymentPlans } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { isFreeReviewActive } from "@/lib/config/promo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Signed-in clients get their profile id attached to the Stripe link as
// client_reference_id, so the webhook can bind the payment to the account
// without relying on email matching.
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

export default async function PaymentPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.payment;
  const promo = dict.promo;
  const freeReview = isFreeReviewActive();

  let profileId: string | null = null;
  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    profileId = user?.id ?? null;
  }

  const plans = getPaymentPlans(locale).map((plan) => ({
    ...plan,
    paymentLinkUrl: withClientReference(plan.paymentLinkUrl, profileId)
  }));

  return (
    <div className="page-shell">
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
          signInWhy: t.signInWhy
        }}
        plans={plans}
        signInHref="/login?next=/payment"
        signedIn={Boolean(profileId)}
      >
        <div className="panel panel--promo">
          <span className="panel__label">{promo.badge}</span>
          <h2>{freeReview ? promo.titleFree : promo.titlePaid}</h2>
          <p>{freeReview ? promo.textFree : promo.textPaid}</p>
          <p className="price-line">
            {freeReview ? promo.priceFree : promo.pricePaid}
            <span className="price-amount">{promo.priceAmount}</span>
          </p>
          <div className="panel-actions">
            <Link className="button" href="/login">
              {freeReview ? promo.ctaFree : promo.cta}
            </Link>
          </div>
        </div>
      </PaymentPlans>

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
