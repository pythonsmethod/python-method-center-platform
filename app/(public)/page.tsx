import Image from "next/image";
import Link from "next/link";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AnhamOpenButton } from "@/components/assistant/AnhamOpenButton";
import { IconAnkh } from "@/components/icons/EgyptianIcons";
import { isFreeReviewActive } from "@/lib/config/promo";
import { resolveAssistantTierForUi } from "@/lib/assistant/tiers";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import "./home.css";

const PROFESSOR_IMAGE = "/images/professor-python.png";

// The number a person reads is their position on the whole path, not inside
// one column: the shared start is 01–02, so each branch continues from 03
// rather than restarting at 01.
function StepList({
  steps,
  startAt
}: {
  steps: readonly { title: string; text: string }[];
  startAt: number;
}) {
  return (
    <ol className="home-track__steps">
      {steps.map((step, index) => (
        <li className="home-step" key={step.title}>
          <span aria-hidden="true" className="home-step__num">
            {String(startAt + index).padStart(2, "0")}
          </span>
          <div>
            <h4>{step.title}</h4>
            <p>{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default async function HomePage() {
  const [locale, tier] = await Promise.all([
    getLocale(),
    resolveAssistantTierForUi()
  ]);
  const dict = getDictionary(locale);
  const t = dict.landing;
  const promo = dict.promo;
  const paths = t.paths;
  const freeReview = isFreeReviewActive();
  const anhamName = locale === "ru" ? "Анхам" : "Anham";

  // A guest is sent to registration; someone already signed in goes straight
  // to their cabinet instead of being asked to sign in again.
  const startHref = tier === "guest" ? "/login" : "/cabinet";

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="home-eyebrow">{t.eyebrow}</p>
          <h1 className="home-hero__title">
            {t.title}
            <span className="home-hero__subtitle">{t.subtitle}</span>
          </h1>
          <p className="home-hero__lead">{t.heroLead}</p>

          <div className="home-actions">
            <Link className="home-button home-button--gold" href={startHref}>
              {t.heroCtaSelf}
              <span aria-hidden="true">→</span>
            </Link>
            <AnhamOpenButton className="home-button">
              {t.heroCtaAnham}
              <IconAnkh className="home-button__ankh" />
            </AnhamOpenButton>
          </div>

          <p className="home-hero__trust">
            <IconAnkh className="home-hero__trust-ankh" />
            {t.heroTrust}
          </p>
        </div>

        <div className="home-hero__art">
          <div aria-hidden="true" className="home-hero__gate">
            <span className="home-hero__gate-ring" />
            <span className="home-hero__gate-ring" />
          </div>
          {/* No portrait here. The same photograph stood in the hero and
              again on the card below, and one picture twice on one screen
              reads as a mistake. Professor Python keeps the card; the gate
              belongs to Анхам, who is the thing a visitor can actually use
              from this screen. */}
          <div className="home-hero__anham">
            <p className="home-bubble">{t.heroBubble}</p>
            <AnhamAvatar size={200} state={tier} title={anhamName} />
          </div>
        </div>
      </section>

      <section aria-label={t.levelsTitle} className="home-figures">
        <article className="home-figure">
          <div className="home-figure__body">
            <h2>Professor Python</h2>
            <p className="home-figure__role">{t.expertLabel}</p>
            <p>{t.expertText}</p>
            <Link className="home-more" href="/professor">
              {t.cardMore}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <Image
            alt=""
            className="home-figure__portrait"
            height={717}
            src={PROFESSOR_IMAGE}
            width={690}
          />
        </article>

        <article className="home-figure home-figure--anham">
          <div className="home-figure__body">
            <h2>{anhamName}</h2>
            <p className="home-figure__role">{t.aiLabel}</p>
            <p>{t.aiText}</p>
            <AnhamOpenButton className="home-more home-more--button">
              {t.cardMore}
              <span aria-hidden="true">→</span>
            </AnhamOpenButton>
          </div>
          <AnhamAvatar className="home-figure__avatar" size={200} state={tier} />
        </article>
      </section>

      <section aria-label={promo.badge} className="home-promo">
        <span aria-hidden="true" className="home-promo__gift">
          🎁
        </span>
        <div className="home-promo__copy">
          <p className="home-promo__badge">{promo.badge}</p>
          <h2>{freeReview ? promo.titleFree : promo.titlePaid}</h2>
          <Link className="home-button home-button--gold" href="/review">
            {freeReview ? promo.ctaFree : promo.cta}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="home-promo__terms">
          <p>{freeReview ? promo.textFree : promo.textPaid}</p>
          <p className="home-promo__price">
            <strong>{freeReview ? promo.priceFree : promo.pricePaid}</strong>
            <span className="home-promo__amount">{promo.priceAmount}</span>
          </p>
        </div>
      </section>

      <section aria-label={t.howTitle} className="home-paths">
        <header className="home-section-head">
          <h2>{t.howTitle}</h2>
          <p>{paths.lead}</p>
        </header>

        <ol className="home-common">
          {paths.common.map((step, index) => (
            <li className="home-step home-step--common" key={step.title}>
              <span aria-hidden="true" className="home-step__num">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div aria-hidden="true" className="home-fork">
          <span />
          <span />
        </div>

        <div className="home-tracks">
          <article className="home-track home-track--free">
            <header className="home-track__head">
              <h3>{paths.freeLabel}</h3>
              <p>{paths.freeNote}</p>
            </header>
            <StepList startAt={paths.common.length + 1} steps={paths.free} />
          </article>

          <article className="home-track home-track--support">
            <header className="home-track__head">
              <h3>{paths.supportLabel}</h3>
              <p>{paths.supportNote}</p>
            </header>
            <StepList startAt={paths.common.length + 1} steps={paths.support} />
          </article>
        </div>
      </section>

      <section aria-label={t.freeTools.title} className="home-tools">
        <header className="home-section-head">
          <p className="home-eyebrow">{t.freeTools.badge}</p>
          <h2>{t.freeTools.title}</h2>
          <p>{t.freeTools.lead}</p>
        </header>

        <div className="home-tools__grid">
          {t.freeTools.items.map((item, index) => (
            <article className="home-tool" key={item.title}>
              <span aria-hidden="true" className="home-tool__icon">
                {index === 0 ? "📈" : "💊"}
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <Link className="home-button home-button--gold" href={startHref}>
          {t.freeTools.cta}
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section className="home-final">
        <div className="home-final__copy">
          <h2>{t.finalTitle}</h2>
          <p>{t.finalText}</p>
          <div className="home-actions">
            <Link className="home-button home-button--gold" href={startHref}>
              {t.finalCtaStart}
              <span aria-hidden="true">→</span>
            </Link>
            <AnhamOpenButton className="home-button">
              {t.finalCtaAsk}
            </AnhamOpenButton>
          </div>
        </div>
        <AnhamAvatar className="home-final__anham" size={190} state={tier} />
      </section>

      <p className="home-tagline">{t.tagline}</p>
    </div>
  );
}
