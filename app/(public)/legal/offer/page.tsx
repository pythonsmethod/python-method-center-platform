import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import {
  getOfferDocumentUrl,
  isOfferInLocale,
  OFFER_VERSION
} from "@/lib/legal/offer";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).offer;

  return { title: `${t.title} — Python Method` };
}

export default async function OfferPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).offer;
  const documentUrl = getOfferDocumentUrl(locale);
  const inOwnLanguage = isOfferInLocale(locale);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      {/* Said before the document, not after it. Someone about to accept a
          contract has to know first that it is not in their language. */}
      {inOwnLanguage ? null : (
        <section aria-label={t.languageNoticeLabel} className="panel-grid">
          <div className="panel panel--notice">
            <span className="panel__label">{t.languageNoticeLabel}</span>
            <p>{t.languageNotice}</p>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/support">
                {t.languageNoticeCta}
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="panel-grid">
        <div className="panel">
          <span className="panel__label">{t.docLabel}</span>
          <h2>
            {t.docHeading} {OFFER_VERSION}
          </h2>
          <p>{t.docText}</p>
          <div className="panel-actions">
            <a
              className="button"
              href={documentUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t.openPdf}
            </a>
          </div>
        </div>
      </section>

      <section className="panel-grid" aria-label={t.viewLabel}>
        <object
          aria-label={t.pdfAlt}
          data={documentUrl}
          style={{
            border: "1px solid var(--line)",
            borderRadius: "12px",
            minHeight: "70vh",
            width: "100%"
          }}
          type="application/pdf"
        >
          <p className="empty-state">{t.pdfFallback}</p>
        </object>
      </section>
    </div>
  );
}
