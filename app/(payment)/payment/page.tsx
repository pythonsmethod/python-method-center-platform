import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { PaymentPlans } from "@/components/payments/PaymentPlans";
import { getPaymentPlans } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { isFreeReviewActive } from "@/lib/config/promo";

export default async function PaymentPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.payment;
  const promo = dict.promo;
  const freeReview = isFreeReviewActive();
  const plans = getPaymentPlans(locale);

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
          offerCheckboxPrefix: t.offerCheckboxPrefix,
          offerCheckboxLink: t.offerCheckboxLink,
          offerHint: t.offerHint
        }}
        plans={plans}
      >
        <div className="panel panel--promo">
          <span className="panel__label">{promo.badge}</span>
          <h2>{freeReview ? promo.titleFree : promo.titlePaid}</h2>
          <p>{freeReview ? promo.textFree : promo.textPaid}</p>
          <p className="price-line">
            {freeReview ? promo.priceFree : promo.pricePaid}
          </p>
          <div className="panel-actions">
            <Link className="button" href="/login">
              {freeReview ? promo.ctaFree : promo.cta}
            </Link>
          </div>
        </div>
      </PaymentPlans>

      <section className="panel-grid" aria-label={t.howLabel}>
        <div className="panel">
          <span className="panel__label">{t.howLabel}</span>
          <h2>{t.howTitle}</h2>
          <p>
            {t.howText} <Link href="/cabinet">{t.howLink}</Link>.
          </p>
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
