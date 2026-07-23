import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export default async function PaymentSuccessPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).paymentSuccess;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <section className="panel-grid" aria-label={t.whatNextLabel}>
        <div className="panel panel--promo">
          <span className="panel__label">{t.whatNextLabel}</span>
          <ol className="success-steps">
            {t.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="panel-actions">
            <Link className="button" href="/cabinet">
              {t.cabinetCta}
            </Link>
          </div>
        </div>
        <div className="panel">
          <span className="panel__label">{t.questionLabel}</span>
          <h2>{t.questionTitle}</h2>
          <p>{t.questionText}</p>
          <div className="panel-actions">
            <Link className="button button--secondary" href="/support">
              {t.supportCta}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
