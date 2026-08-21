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
// Short by his own request. He did not want his life told on a website, so
// everything personal is gone — the school years, the illness he had, the
// sport, the medals, the nickname's history. What remains of the private
// side is his mother, because she is the reason the method exists and he
// asked for that part to stay.
//
// Two kinds of statement live here and they are kept apart on purpose.
//
// What he *does* — his mother's illness as the reason he started, the years
// spent with people in a severe condition, restoring the body during and
// after treatment — is biography, and it is told in his own words.
//
// What the method *achieves against a disease* is not on this page at all.
// Not "helped them beat the diagnosis", not "the doctors confirmed it", not
// "the oncologists were astonished". On a page that leads to a payment,
// those turn a rehabilitation practice into an advertised cancer cure:
// unlawful to publish in California, banned outright by both payment
// processors, and — the part that matters most — capable of persuading
// somebody to postpone the treatment that is keeping them alive.
//
// tests/professor-claims.test.ts holds that line so it cannot be crossed by
// an edit made in a hurry.
//
// The company, the address and the thirty years still come from clause 2 of
// the offer — the document the client signs — and nowhere else.
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

      {/* A small window, not a portrait: he asked for his face to take a
          corner of the page rather than a third of the screen. */}
      <section className="professor-hero" aria-label={t.title}>
        <div className="professor-hero__head">
          <span className="professor-hero__portrait">
            <Image
              alt="Professor Python"
              height={717}
              priority
              sizes="96px"
              src={PROFESSOR_IMAGE}
              width={690}
            />
          </span>
          <span>
            <span className="professor-hero__name">{t.fullName}</span>
            <span className="professor-hero__nickname">{t.nicknameNote}</span>
          </span>
        </div>
        <p className="professor-hero__lead">{t.lead}</p>
      </section>

      <section className="panel professor-story" aria-label={t.origin.title}>
        <span className="panel__label">{t.origin.label}</span>
        <h2>{t.origin.title}</h2>
        <blockquote className="professor-quote">{t.origin.quote}</blockquote>
        {t.origin.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <blockquote className="professor-quote">{t.origin.quoteEnd}</blockquote>
        <p className="professor-story__after">{t.origin.after}</p>
      </section>

      {/* The boundary is the second block on the page, not a line of small
          print at the bottom. This is where a reader decides what he is,
          and he says it better than any disclaimer would. */}
      <section className="panel professor-story" aria-label={t.work.title}>
        <span className="panel__label">{t.work.label}</span>
        <h2>{t.work.title}</h2>
        <blockquote className="professor-quote">{t.work.quote}</blockquote>
        {t.work.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p className="professor-warning">{t.work.warning}</p>
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

      <section className="panel" aria-label={t.howTitle}>
        <span className="panel__label">{t.personalLabel}</span>
        <h2>{t.howTitle}</h2>
        <p>{t.howText}</p>
        {/* The list of what he will not do stood here as its own block and
            read as a wall of refusals on the page where someone decides to
            trust him. It is gone by the founder's call — the same terms are
            in the contract a client accepts at payment.

            This paragraph is not. Without it the page reads as a medical
            service, which it is not, and there would be nowhere on it that
            says where to go in an emergency. So it stays, quietly, at the
            end of the block about how the work actually happens. */}
        <p className="professor-legal">{t.boundaryText}</p>
      </section>

      <section className="panel" aria-label={t.companyTitle}>
        <span className="panel__label">{t.companyLabel}</span>
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
