import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/PageHeader";
import { ProfessorFacts } from "@/components/ProfessorFacts";
import "./professor-facts.css";
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

  return { title: t.title, description: t.lead };
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

      <section className="panel professor-story" aria-label={t.work.label}>
        <span className="panel__label">{t.work.label}</span>
        {t.work.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <ProfessorFacts title={t.personalLabel} facts={facts} />

      <section className="panel" aria-label={t.howTitle}>
        <span className="panel__label">{t.personalLabel}</span>
        <h2>{t.howTitle}</h2>
        <p>{t.howText}</p>
      </section>

    </div>
  );
}
