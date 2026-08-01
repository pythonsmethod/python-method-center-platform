import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { isFreeReviewActive } from "@/lib/config/promo";
import { IconAnkh, IconScarab, IconSun } from "@/components/icons";
import { IconEyeOfHorus } from "@/components/icons/EgyptianIcons";

const heroIcons = [IconScarab, IconAnkh, IconSun];

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
        <ul className="hero__points">
          {t.points.map((point, index) => {
            const Icon = heroIcons[index] ?? IconAnkh;

            return (
              <li key={point}>
                <Icon size={22} />
                <span>{point}</span>
              </li>
            );
          })}
        </ul>
        {/* The AI is the thing a visitor must notice first: it is what
            makes this platform different from a clinic's website. */}
        <aside aria-label={t.aiTitle} className="hero-ai">
          <span className="hero-ai__pulse" aria-hidden="true" />
          <div className="hero-ai__body">
            <span className="hero-ai__label">{t.aiLabel}</span>
            <p className="hero-ai__title">{t.aiTitle}</p>
            <p className="hero-ai__text">{t.aiText}</p>
            <ol className="hero-ai__levels">
              {t.aiLevels.map((level) => (
                <li key={level.title}>
                  <strong>{level.title}</strong>
                  <span>{level.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>

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
        {/* The AI sits apart from the numbered steps on purpose: it walks
            with the person through all of them, it is not one of them. */}
        <div className="how-ai">
          <span className="how-ai__icon">
            <IconEyeOfHorus />
          </span>
          <div>
            <span className="panel__label">{t.aiStepLabel}</span>
            <h3>{t.aiStepTitle}</h3>
            <p>{t.aiStepText}</p>
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
