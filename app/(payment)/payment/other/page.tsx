import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { AltPaymentForm } from "@/components/payments/AltPaymentForm";
import { getAltPaymentBlocks } from "@/lib/payments/alt-methods";

export const dynamic = "force-dynamic";

// For everyone whose card Stripe cannot accept. Whole countries fall into
// this, and a person who is ready to pay and simply cannot is the most
// expensive visitor to lose.
export default async function OtherPaymentPage() {
  const t = getDictionary(await getLocale()).altPayment;
  const blocks = getAltPaymentBlocks();

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

      {blocks.length > 0 ? (
        <section className="panel-grid" aria-label={t.methodsAria}>
          {blocks.map((block) => (
            <div className="panel" key={block.id}>
              <span className="panel__label">{t.methodLabel}</span>
              <h2>{block.title}</h2>
              <p>{block.hint}</p>
              <pre className="payment-details">{block.details}</pre>
            </div>
          ))}
        </section>
      ) : null}

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
