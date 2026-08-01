import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { isFreeReviewActive } from "@/lib/config/promo";
import { IconAnkh } from "@/components/icons";
import { IconEyeOfHorus } from "@/components/icons/EgyptianIcons";


export default async function HomePage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.landing;
  const promo = dict.promo;
  const freeReview = isFreeReviewActive();

  return (
    <div className="page-shell">
      <section className="hero">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="hero__subtitle">{t.subtitle}</p>
        {/* Two pillars, side by side: the living expert and the AI. A
            visitor must see both at once — that pairing is the platform. */}
        <div className="hero-pillars">
          <article className="hero-pillar hero-pillar--expert">
            <span className="hero-pillar__icon">
              <IconAnkh />
            </span>
            <span className="hero-pillar__label">{t.expertLabel}</span>
            <h2 className="hero-pillar__title">{t.expertTitle}</h2>
            <p className="hero-pillar__text">{t.expertText}</p>
          </article>

          <article className="hero-pillar hero-pillar--ai">
            <span className="hero-pillar__pulse" aria-hidden="true" />
            <span className="hero-pillar__icon">
              <IconEyeOfHorus />
            </span>
            <span className="hero-pillar__label">{t.aiLabel}</span>
            <h2 className="hero-pillar__title">{t.aiTitle}</h2>
            <p className="hero-pillar__text">{t.aiText}</p>
            <ol className="hero-ai__levels">
              {t.aiLevels.map((level) => (
                <li key={level.title}>
                  <strong>{level.title}</strong>
                  <span>{level.text}</span>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <div className="hero__cta">
          <Link className="button" href="/login">
            {t.cta}
          </Link>
        </div>
      </section>

      <section aria-label={promo.badge} className="promo-banner">
        <span className="promo-banner__badge">{promo.badge}</span>
        <h2>{freeReview ? promo.titleFree : promo.titlePaid}</h2>
        <p>{freeReview ? promo.textFree : promo.textPaid}</p>
        <p className="promo-banner__price">
          {freeReview ? promo.priceFree : promo.pricePaid}
          <span className="price-amount">{promo.priceAmount}</span>
        </p>
        <div className="promo-banner__actions">
          <Link className="button" href="/login">
            {freeReview ? promo.ctaFree : promo.cta}
          </Link>
        </div>
      </section>

      <p className="tagline">{t.tagline}</p>

      <section aria-label={t.howTitle}>
        <p className="ornament">☥ ☥ ☥</p>
        <h2 className="section-title">{t.howTitle}</h2>
        <div className="how-paths">
          <div className="how-path">
            <span className="how-path__mark">{t.pathAiMark}</span>
            <h3>{t.pathAiTitle}</h3>
            <p>{t.pathAiText}</p>
          </div>
          <span className="how-paths__or">{t.pathsOr}</span>
          <div className="how-path">
            <span className="how-path__mark">{t.pathSelfMark}</span>
            <h3>{t.pathSelfTitle}</h3>
            <p>{t.pathSelfText}</p>
          </div>
        </div>

        <p className="how-steps__lead">{t.stepsLead}</p>

        <div className="panel-grid how-steps">
          {t.steps.map((step, index) => (
            <div className="panel how-step" key={step.title}>
              <span className="how-step__num">{index + 1}</span>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
          ))}
          <div className="panel">
            <span className="panel__label">{t.startLabel}</span>
            <h2>{t.startTitle}</h2>
            <p>{t.startText}</p>
            <div className="panel-actions">
              <Link className="button" href="/login">
                {t.cta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <p className="quote-strip">{t.quote}</p>
    </div>
  );
}
