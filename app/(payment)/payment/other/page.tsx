import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { AltPaymentForm } from "@/components/payments/AltPaymentForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).altPayment;

  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: "/payment/other" }
  };
}

export const dynamic = "force-dynamic";

// For everyone whose card Stripe cannot accept. Whole countries fall into
// this, and a person who is ready to pay and simply cannot is the most
// expensive visitor to lose.
export default async function OtherPaymentPage() {
  const t = getDictionary(await getLocale()).altPayment;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <div className="back-link">
        <Link className="button button--secondary" href="/payment">
          {t.back}
        </Link>
      </div>

      {/* First, before any bank details: say out loud why the card was
          refused. Someone whose card is blocked by their country and not by
          their balance usually concludes the problem is them, and leaves. */}
      <section className="panel" aria-label={t.blockedTitle}>
        <span className="panel__label">{t.blockedLabel}</span>
        <h2>{t.blockedTitle}</h2>
        <p>{t.blockedText}</p>
        <ul className="alt-payment-routes">
          {t.blockedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-label={t.officialTitle}>
        <span className="panel__label">{t.officialLabel}</span>
        <h2>{t.officialTitle}</h2>
        <p>{t.officialText}</p>
      </section>


      <section className="documents-section" aria-label={t.requestAria}>
        <div className="documents-layout">
          <div className="document-upload">
            <div>
              <span className="panel__label">{t.requestLabel}</span>
              <h2>{t.requestTitle}</h2>
              <p>
                {t.requestText}
              </p>
            </div>
            <AltPaymentForm labels={t} />
          </div>

          <div className="documents-list-panel">
            <div>
              <span className="panel__label">{t.howLabel}</span>
              <h2>{t.howTitle}</h2>
            </div>
            <ol className="success-steps">
              <li>{t.step1}</li>
              <li>{t.step2}</li>
              <li>
                {t.step3}
              </li>
              <li>
                {t.step4}
              </li>
            </ol>
            <p className="founder-hint">
              {t.note}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
