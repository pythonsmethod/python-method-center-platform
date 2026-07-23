import Link from "next/link";
import { EmergencyNotice } from "@/components/EmergencyNotice";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { isFreeReviewActive } from "@/lib/config/promo";
import {
  IconAnkh,
  IconEye,
  IconFeather,
  IconLotus,
  IconPyramid,
  IconScarab,
  IconScroll,
  IconSun
} from "@/components/icons";

const heroIcons = [IconScarab, IconAnkh, IconSun];
const cabinetIcons = [
  IconAnkh,
  IconEye,
  IconLotus,
  IconScarab,
  IconSun,
  IconScroll,
  IconFeather,
  IconPyramid
];
const whyIcons = [IconEye, IconScarab, IconLotus, IconPyramid, IconSun];

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
        </p>
        <div className="promo-banner__actions">
          <Link className="button" href="/login">
            {freeReview ? promo.ctaFree : promo.cta}
          </Link>
        </div>
        <p className="promo-banner__note">{promo.note}</p>
      </section>

      <p className="tagline">{t.tagline}</p>

      <section className="parchment" aria-label={t.cabinetsTitle}>
        <p className="ornament">☥ ☥ ☥</p>
        <h2 className="section-title">{t.cabinetsTitle}</h2>
        <div className="pcard-grid">
          {t.cabinets.map((cabinet, index) => {
            const Icon = cabinetIcons[index] ?? IconAnkh;

            return (
              <div className="pcard" key={cabinet.title}>
                <Icon />
                <h3>{cabinet.title}</h3>
                <p>{cabinet.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label={t.whyTitle}>
        <p className="ornament">☥ ☥ ☥</p>
        <h2 className="section-title">{t.whyTitle}</h2>
        <div className="why-grid">
          {t.why.map((card, index) => {
            const Icon = whyIcons[index] ?? IconAnkh;

            return (
              <div className="why-card" key={card.title}>
                <Icon />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-label={t.howTitle}>
        <p className="ornament">☥ ☥ ☥</p>
        <h2 className="section-title">{t.howTitle}</h2>
        <div className="panel-grid" style={{ marginTop: 26 }}>
          {t.steps.map((step) => (
            <div className="panel" key={step.title}>
              <span className="panel__label">{t.stepLabel}</span>
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

      <EmergencyNotice />

      <section className="panel-grid" aria-label={t.disclaimerLabel}>
        <div className="panel">
          <span className="panel__label">{t.disclaimerLabel}</span>
          <h2>{t.disclaimerTitle}</h2>
          <p>
            {t.disclaimerText}{" "}
            <Link href="/legal/offer">{t.disclaimerLink}</Link>.
          </p>
        </div>
      </section>

      <p className="quote-strip">{t.quote}</p>
    </div>
  );
}
