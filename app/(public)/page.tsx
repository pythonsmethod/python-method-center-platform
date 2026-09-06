import Image from "next/image";
import { Link } from "@/components/LocaleLink";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AnhamOpenButton } from "@/components/assistant/AnhamOpenButton";
import { ScrollReveal } from "@/components/ScrollReveal";

import { resolveAssistantTierForUi } from "@/lib/assistant/tiers";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { APP_STORE_URL, GOOGLE_PLAY_URL } from "@/lib/config/mobile-app";
import {
  organizationStructuredData,
  serializeStructuredData,
  websiteStructuredData
} from "@/lib/seo/structured-data";
import "./home.css";
import "./home-app-promo.css";
import { HomeAppPromo } from "@/components/home/HomeAppPromo";
import { HomeJourney } from "@/components/home/HomeJourney";
import "./home-journey.css";

const PROFESSOR_IMAGE = "/images/professor-python.png";

export default async function HomePage() {
  const [locale, tier] = await Promise.all([
    getLocale(),
    resolveAssistantTierForUi()
  ]);
  const t = getDictionary(locale).landing;

  const startHref = tier === "guest" ? "/login" : "/cabinet";
  const anhamName = locale === "ru" ? "Анхам" : "Anham";
  const mobile = locale === "ru"
    ? {
        appEyebrow: "Приложение Python Method",
        appTitle: "Больше возможностей — в приложении",
        appText: "Установите приложение, чтобы пользоваться расширенным личным кабинетом, быть на связи с Анхамом и видеть свой путь в одном месте.",
        appStore: "Скачать в App Store",
        playStore: "Скачать в Google Play",
        comingSoon: "Скоро",
        journeyTitle: "Как работает центр",
        supportTitle: "Сопровождение",
        supportText: "Сопровождение Карена на всём вашем пути.",
        communicationTitle: "Ежедневное общение и поддержка",
        communicationText: "Карен и Анхам остаются рядом, отвечают на вопросы и помогают двигаться дальше.",
        appStepTitle: "Расширенный кабинет в приложении",
        appStepText: "Все основные функции, история и персональный путь собраны в мобильном приложении."
      }
    : {
        appEyebrow: "Python Method app",
        appTitle: "More possibilities in the app",
        appText: "Install the app for the expanded personal cabinet, a direct connection with Anham and your complete journey in one place.",
        appStore: "Download on the App Store",
        playStore: "Get it on Google Play",
        comingSoon: "Coming soon",
        journeyTitle: "How the center works",
        supportTitle: "Support program",
        supportText: "Karen’s guidance throughout your journey.",
        communicationTitle: "Daily communication and support",
        communicationText: "Karen and Anham stay beside you, answer questions and help you keep moving.",
        appStepTitle: "Expanded cabinet in the app",
        appStepText: "Core functions, history and your personal journey come together in the mobile app."
      };
  const mobileSteps = [
    ...t.paths.common,
    { title: t.paths.reviewLabel, text: t.paths.reviewNote },
    { title: mobile.supportTitle, text: mobile.supportText },
    { title: mobile.communicationTitle, text: mobile.communicationText },
    { title: mobile.appStepTitle, text: mobile.appStepText }
  ];

  return (
    <div className="app-home">
      <script
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(websiteStructuredData(locale))
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(organizationStructuredData(locale))
        }}
        type="application/ld+json"
      />
      <ScrollReveal />
      <section className="app-hero" aria-labelledby="app-title">
        <div className="app-hero__copy">
          <p className="app-kicker">{t.eyebrow}</p>
          <h1 id="app-title" className="app-title-egypt"><span>{t.title}</span></h1>
          <p className="app-hero__subtitle">{t.subtitle}</p>
          <p className="app-hero__lead">{t.heroLead}</p>

          <div className="app-actions">
            <Link className="app-button app-button--primary" href={startHref}>
              {t.heroCtaSelf}
              <span aria-hidden="true">→</span>
            </Link>
            <AnhamOpenButton className="app-button app-button--secondary app-button--anham-desktop">
              {t.heroCtaAnham}
            </AnhamOpenButton>
          </div>

          <p className="app-trust app-trust--desktop">✓ {t.heroTrust}</p>
        </div>

        <div className="app-hero__visual" aria-label={t.aiLabel}>
          <div className="app-assistant-card">
            <span className="app-status"><i /> {t.aiLabel}</span>
            <p>{t.heroBubble}</p>
            <AnhamAvatar size={184} state={tier} title={anhamName} />
            <AnhamOpenButton className="app-button app-button--secondary app-button--anham-mobile">
              {t.heroCtaAnham}
            </AnhamOpenButton>
            <p className="app-trust app-trust--mobile">✓ {t.heroTrust}</p>
          </div>
          <HomeAppPromo locale={locale} appStore={APP_STORE_URL} googlePlay={GOOGLE_PLAY_URL} />
        </div>
      </section>

      <section className="app-route" aria-labelledby="route-title" data-scroll-reveal>
        <HomeJourney title={mobile.journeyTitle} steps={mobileSteps} />
        <header className="app-section-head">
          <p className="app-kicker">{t.howTitle}</p>
          <h2 id="route-title">{t.paths.lead}</h2>
        </header>

        <ol className="app-steps">
          {t.paths.common.map((step, index) => (
            <li data-scroll-reveal key={step.title}>
              <span>{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
          <li data-scroll-reveal>
            <span>{t.paths.common.length + 1}</span>
            <div><h3>{t.paths.reviewLabel}</h3><p>{t.paths.reviewNote}</p></div>
          </li>
        </ol>
        <div className="app-mobile-route">
          <h2>{mobile.journeyTitle}</h2>
          <ol>
            {mobileSteps.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="app-expert" aria-labelledby="expert-title" data-scroll-reveal>
        {/* A small window, not a portrait band. He asked for his face to
            take a corner of the page rather than half a screen, and the
            mobile-launch layout brought the big photograph back. */}
        <div className="app-expert__portrait">
          <Image
            alt=""
            height={717}
            sizes="132px"
            src={PROFESSOR_IMAGE}
            width={690}
          />
        </div>
        <div className="app-expert__copy">
          <p className="app-kicker">{t.expertLabel}</p>
          <h2 id="expert-title">Professor Python</h2>
          <p>{t.expertText}</p>
          <Link className="app-text-link" href="/professor">{t.cardMore} <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="app-final" data-scroll-reveal>
        <div><p className="app-kicker">Python Method</p><h2>{t.finalTitle}</h2><p>{t.finalText}</p></div>
        <Link className="app-button app-button--primary" href={startHref}>{t.finalCtaStart} <span aria-hidden="true">→</span></Link>
      </section>
    </div>
  );
}
