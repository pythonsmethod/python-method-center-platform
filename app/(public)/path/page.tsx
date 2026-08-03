import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "Как всё устроено — Python Method Center",
  description:
    "Кто мы, что входит в сопровождение, сколько это стоит, кто увидит ваши документы и сколько длится работа — всё до регистрации."
};

// The step before the account. A person worried about their health does not
// hand their email to a site they have not yet come to trust — first they
// need the answers they are silently asking. Only after those comes the
// registration button, and by then it is a decision, not a leap.
export default async function PathPage() {
  const locale = await getLocale();
  const t = getDictionary(locale).path;

  return (
    <div className="page-shell">
      <section className="hero">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="hero__subtitle">{t.lead}</p>
      </section>

      <section aria-label={t.title} className="promo-faq">
        <dl className="promo-faq__list promo-faq__list--single">
          {t.sections.map((section, index) => (
            <div className="promo-faq__item" key={section.q}>
              <dt>
                {index + 1}. {section.q}
              </dt>
              <dd>{section.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel path-cta" aria-label={t.ctaTitle}>
        <h2>{t.ctaTitle}</h2>
        <p>{t.ctaText}</p>
        <div className="panel-actions">
          <Link className="button" href="/login">
            {t.cta}
          </Link>
        </div>
        <p className="path-cta__note">{t.ctaSecondary}</p>
      </section>
    </div>
  );
}
