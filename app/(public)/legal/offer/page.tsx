import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import {
  OFFER_EN_FOOTER,
  OFFER_EN_SECTIONS,
  OFFER_EN_SUBTITLE,
  OFFER_EN_TITLE,
  OFFER_EN_TRADEMARK_NOTE,
  OFFER_EN_TRANSLATION_NOTE
} from "@/lib/legal/offer-en";
import { OFFER_DOCUMENT_URL, OFFER_VERSION } from "@/lib/legal/offer";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).offer;

  return { title: `${t.title} — Python Method` };
}

export default async function OfferPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).offer;
  const isEnglish = locale === "en";

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

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
              href={OFFER_DOCUMENT_URL}
              rel="noreferrer"
              target="_blank"
            >
              {t.openOriginal}
            </a>
          </div>
        </div>
      </section>

      {isEnglish ? (
        // The English text is set as a page rather than a second PDF: it
        // stays readable on a phone, a screen reader can read it, and every
        // future change to a contract shows up in a diff.
        <article className="offer-doc">
          <p className="offer-doc__note">{OFFER_EN_TRANSLATION_NOTE}</p>

          <h2 className="offer-doc__title">{OFFER_EN_TITLE}</h2>
          <p className="offer-doc__subtitle">{OFFER_EN_SUBTITLE}</p>

          {OFFER_EN_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              {section.paragraphs?.map((text) => (
                <p key={text.slice(0, 40)}>{text}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((item) => (
                    <li key={item.slice(0, 40)}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <p className="offer-doc__footer">{OFFER_EN_FOOTER}</p>
          <p className="offer-doc__footer">{OFFER_EN_TRADEMARK_NOTE}</p>

          <p className="offer-doc__ask">
            {t.questionsPrefix}
            <Link href="/support">{t.questionsLink}</Link>.
          </p>
        </article>
      ) : (
        <section className="panel-grid" aria-label={t.viewLabel}>
          <object
            aria-label={t.pdfAlt}
            data={OFFER_DOCUMENT_URL}
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
      )}
    </div>
  );
}
