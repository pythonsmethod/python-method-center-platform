import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { IconAnkh } from "@/components/icons/EgyptianIcons";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

const PROFESSOR_IMAGE = "/images/professor-python.png";

// The page about the person behind the method.
//
// Everything factual here comes from clause 2 of the offer — the document
// the client accepts — and from nowhere else. Thirty years of practice,
// the authorship of the method, the company and its address: all of it is
// already signed. No education, no titles, no count of people helped, and
// nothing that would read as a medical qualification: he is described in
// the contract as a specialist in the recovery of the body, not as a
// physician, and the whole platform's boundary rests on that distinction.
export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale()).professor;

  return { title: `${t.title} — Python Method`, description: t.lead };
}

export default async function ProfessorPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).professor;

  const facts = [
    { label: t.yearsLabel, value: t.yearsValue, text: t.yearsText },
    { label: t.methodLabel, value: t.methodValue, text: t.methodText },
    { label: t.personalLabel, value: t.personalValue, text: t.personalText }
  ];

  return (
    <div className="page-shell">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.subtitle} />

      <section className="professor-hero" aria-label={t.title}>
        <div className="professor-hero__portrait">
          <Image
            alt="Professor Python"
            height={717}
            priority
            src={PROFESSOR_IMAGE}
            width={690}
          />
        </div>
        <p className="professor-hero__lead">{t.lead}</p>
      </section>

      <section className="professor-facts" aria-label={t.yearsLabel}>
        {facts.map((fact) => (
          <div className="professor-fact" key={fact.label}>
            <span className="professor-fact__icon" aria-hidden="true">
              <IconAnkh />
            </span>
            <span className="panel__label">{fact.label}</span>
            <strong className="professor-fact__value">{fact.value}</strong>
            <p>{fact.text}</p>
          </div>
        ))}
      </section>

      <section className="panel-grid" aria-label={t.howTitle}>
        <div className="panel">
          <span className="panel__label">{t.personalLabel}</span>
          <h2>{t.howTitle}</h2>
          <p>{t.howText}</p>
        </div>
        {/* Said on his own page, not only in the footer: a page about a
            person is exactly where someone decides what he is. */}
        <div className="panel">
          <span className="panel__label">{t.boundaryLabel}</span>
          <h2>{t.boundaryTitle}</h2>
          <p>{t.boundaryText}</p>
        </div>
      </section>

      <section className="panel" aria-label={t.companyTitle}>
        <span className="panel__label">{t.companyTitle}</span>
        <h2>{t.companyTitle}</h2>
        <p>{t.companyText}</p>
        <div className="panel-actions">
          <Link className="button button--secondary" href="/legal/offer">
            {t.offerLink}
          </Link>
        </div>
      </section>

      <section className="panel panel--promo" aria-label={t.ctaTitle}>
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaText}</p>
        <div className="panel-actions">
          <Link className="button" href="/review">
            {t.ctaFree}
          </Link>
          <Link className="button button--secondary" href="/payment">
            {t.ctaPlans}
          </Link>
        </div>
      </section>
    </div>
  );
}
