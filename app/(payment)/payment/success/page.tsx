import type { Metadata } from "next";
import { Link } from "@/components/LocaleLink";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

type SuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).paymentSuccess;

  return { title: t.eyebrow, description: t.description };
}

export default async function PaymentSuccessPage({
  searchParams
}: SuccessPageProps) {
  const locale = await getLocale();
  const t = getDictionary(locale).paymentSuccess;
  const params = await searchParams;
  const viaPaypal = params?.method === "paypal";

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {viaPaypal ? (
        <div className="notice notice--success">
          <span className="panel__label">{t.paypalLabel}</span>
          <h2>{t.paypalTitle}</h2>
          <p>{t.paypalText1}</p>
          <p>{t.paypalText2}</p>
        </div>
      ) : null}

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
