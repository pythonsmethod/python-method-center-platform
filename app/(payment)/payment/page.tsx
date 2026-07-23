import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getPaymentPlans } from "@/lib/payments/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export default async function PaymentPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).payment;
  const plans = getPaymentPlans(locale);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <section className="panel-grid">
        {plans.map((plan) => (
          <div className="panel" key={plan.product}>
            <span className="panel__label">{t.planLabel}</span>
            <h2>{plan.title}</h2>
            <p>{plan.description}</p>
            <p className="price-line">{plan.priceLine}</p>
            <div className="panel-actions">
              {plan.paymentLinkUrl ? (
                <a
                  className="button"
                  href={plan.paymentLinkUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {t.payButton}
                </a>
              ) : (
                <span className="status-badge">{t.unavailable}</span>
              )}
            </div>
          </div>
        ))}
      </section>

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
