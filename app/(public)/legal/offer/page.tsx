import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { OFFER_CONTENT } from "@/lib/legal/offer-content";
import { OFFER_ARCHIVE_V2_URL, OFFER_VERSION } from "@/lib/legal/offer";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).offer;

  return { title: `${t.title} — Python Method` };
}

export default async function OfferPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).offer;
  const doc = OFFER_CONTENT[locale];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />

      <article className="offer-doc">
        {doc.intro ? <p className="offer-doc__note">{doc.intro}</p> : null}

        <h2 className="offer-doc__title">{doc.title}</h2>
        <p className="offer-doc__subtitle">{doc.subtitle}</p>
        <p className="offer-doc__version">
          {t.docHeading} {OFFER_VERSION}
        </p>

        {doc.sections.map((section) => (
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

        <p className="offer-doc__footer">{doc.footer}</p>
        <p className="offer-doc__footer">{doc.trademark}</p>

        <p className="offer-doc__ask">
          {t.questionsPrefix}
          <Link href="/support">{t.questionsLink}</Link>.
        </p>

        {/* The superseded edition stays reachable: clients accepted it, and
            clause 12 says their terms do not change under them. */}
        <p className="offer-doc__archive">
          <a href={OFFER_ARCHIVE_V2_URL} rel="noreferrer" target="_blank">
            {t.archiveLink}
          </a>
        </p>
      </article>
    </div>
  );
}
