import Link from "next/link";
import Image from "next/image";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { isFreeReviewActive } from "@/lib/config/promo";
import { resolveAssistantTierForUi } from "@/lib/assistant/tiers";
import "./homepage-v2.css";

const journeyIcons = ["✦", "◌", "▤", "◇", "⌁", "↑"];

export default async function HomePage() {
  const [locale, tier] = await Promise.all([getLocale(), resolveAssistantTierForUi()]);
  const dict = getDictionary(locale);
  const t = dict.landing;
  const promo = dict.promo;
  const freeReview = isFreeReviewActive();
  const isRu = locale === "ru";
  const copy = isRu ? {
    heroTitle: "Ясный путь к восстановлению.", heroLead: "Ваше состояние, медицинские документы и следующие шаги — в одном спокойном, продуманном пространстве.",
    self: "Начать самостоятельно", anham: "Начать с Анхамом", private: "Конфиденциально", human: "Личный разбор", pace: "В вашем темпе",
    foundations: "Две опоры", foundationTitle: "Экспертное решение. Постоянная поддержка.", expert: "Эксперт", companion: "Спутник на платформе",
    anhamText: "Остаётся рядом между этапами, помогает подготовиться и делает сложный путь спокойным, личным и понятным.", gift: "Подарок центра", giftTitle: "Начните с бесплатного разбора анализов.", giftCta: "Получить разбор",
    journey: "Ваш путь", journeyTitle: "От неопределённости к ясному направлению.", recovery: "Начало восстановления", recoveryText: "Двигайтесь дальше с ясным направлением, поддержкой и видимым прогрессом.",
    tools: "Бесплатные инструменты", toolsTitle: "Небольшие данные. Важная ясность.", open: "Открыть инструмент", waiting: "Анхам рядом", ready: "Я готов провести вас.", finalText: "Сегодня не нужно понимать весь путь. Мы можем начать вместе — с первого вопроса."
  } : {
    heroTitle: "A clearer path back to yourself.", heroLead: "Your health story, medical documents, and next steps—held in one calm, considered space.",
    self: "Start independently", anham: "Start with Anham", private: "Private by design", human: "Human-led review", pace: "Your pace, respected",
    foundations: "Two foundations", foundationTitle: "Expert judgment. Constant presence.", expert: "The expert", companion: "Your platform companion",
    anhamText: "Stays close between every step, helps you prepare, and makes a complex process feel calm, personal, and understandable.", gift: "A gift from the center", giftTitle: "Begin with a free analyses review.", giftCta: "Receive my review",
    journey: "Your journey", journeyTitle: "From uncertainty to clear direction.", recovery: "Recovery begins", recoveryText: "Move forward with a clear direction, continuous support, and visible progress.",
    tools: "Free tools", toolsTitle: "Small insights. Meaningful clarity.", open: "Open the tool", waiting: "Anham is here", ready: "I am ready to guide you.", finalText: "You do not need to understand the whole path today. We can begin with the first question, together."
  };

  const journey = [...t.steps.map((step) => ({ title: step.title, text: step.text })), { title: copy.recovery, text: copy.recoveryText }];
  const destination = tier === "guest" ? "/login" : "/cabinet";

  return <div className={`home-v2 home-v2--${tier}`}>
    <section className="hv2-hero">
      <div className="hv2-arches" aria-hidden="true"><i/><i/><i/></div>
      <div className="hv2-hero__copy">
        <p className="hv2-kicker">{t.eyebrow}</p><h1>{copy.heroTitle}</h1><p className="hv2-lead">{copy.heroLead}</p>
        <div className="hv2-actions"><Link className="hv2-button hv2-button--gold" href="/login">{copy.self}</Link><a className="hv2-button" href="#anham">{copy.anham} ↗</a></div>
        <div className="hv2-trust"><span>{copy.private}</span><span>{copy.human}</span><span>{copy.pace}</span></div>
      </div>
      <div className="hv2-professor" aria-label="Professor Python"><div className="hv2-professor__light"/><Image className="hv2-professor__image" src="/images/professor-python-temp-v2.png" alt="Professor Python" fill priority sizes="(max-width: 900px) 100vw, 42vw"/><div className="hv2-professor__caption"><strong>Professor Python</strong><span>{t.expertLabel}</span></div></div>
    </section>

    <section className="hv2-section"><header className="hv2-heading"><p>{copy.foundations}</p><h2>{copy.foundationTitle}</h2></header>
      <div className="hv2-foundations"><article className="hv2-foundation hv2-foundation--professor"><span className="hv2-index">I</span><div className="hv2-foundation-professor"><Image src="/images/professor-python-temp-v2.png" alt="Professor Python" fill sizes="(max-width: 900px) 100vw, 42vw"/></div><div className="hv2-foundation__copy"><p className="hv2-kicker">{copy.expert}</p><h3>Professor Python</h3><p>{t.expertText}</p></div></article>
      <article className={`hv2-foundation hv2-foundation--anham hv2-foundation--${tier}`} id="anham"><span className="hv2-index">II</span><div className="hv2-anham-portrait"><Image src="/images/anham-character-v2.png" alt="Anham, your platform companion" fill sizes="(max-width: 900px) 100vw, 42vw"/></div><div className="hv2-foundation__copy"><p className="hv2-kicker">{copy.companion}</p><h3>Anham</h3><p>{copy.anhamText}</p><span className="hv2-state-label">{tier === "guest" ? (isRu ? "Знакомство" : "First meeting") : tier === "registered" ? (isRu ? "Личный спутник" : "Personal companion") : (isRu ? "Сопровождение кейса" : "Beside your case")}</span></div></article></div>
    </section>

    <section className="hv2-gift"><div className="hv2-seal"><span>{promo.badge}</span><b>01</b></div><div><p className="hv2-kicker">{copy.gift}</p><h2>{freeReview ? copy.giftTitle : promo.titlePaid}</h2><p>{freeReview ? promo.textFree : promo.textPaid}</p><strong>{freeReview ? promo.priceFree : promo.pricePaid} <span>{promo.priceAmount}</span></strong></div><Link className="hv2-button hv2-button--gold" href="/review">{freeReview ? copy.giftCta : promo.cta}</Link></section>

    <section className="hv2-section"><header className="hv2-heading hv2-heading--split"><div><p>{copy.journey}</p><h2>{copy.journeyTitle}</h2></div><p>{t.stepsLead}</p></header><ol className="hv2-timeline">{journey.map((step,index)=><li key={step.title}><div className="hv2-step-icon" aria-hidden="true">{journeyIcons[index]}</div><span>0{index+1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol></section>

    <section className="hv2-section hv2-tools"><header className="hv2-heading"><p>{copy.tools}</p><h2>{copy.toolsTitle}</h2></header><div className="hv2-toolgrid">{t.freeTools.items.map((item,index)=><Link className="hv2-tool" href={index===0?"/cabinet/metrics":"/cabinet/supplements"} key={item.title}><span className="hv2-index">0{index+1}</span><div className={`hv2-toolvisual hv2-toolvisual--${index===0?"metrics":"supplements"}`} aria-hidden="true">{index===0?<><i/><i/><i/><b>72</b></>:<><i/><i/></>}</div><div><p className="hv2-kicker">{t.freeTools.badge}</p><h3>{item.title}</h3><p>{item.text}</p><strong>{copy.open} →</strong></div></Link>)}</div></section>

    <section className="hv2-final"><div className="hv2-anham-orb" aria-hidden="true">A</div><p className="hv2-kicker">{copy.waiting}</p><h2>{copy.ready}</h2><p>{copy.finalText}</p><Link className="hv2-button hv2-button--gold" href={destination}>{copy.anham}</Link></section>
  </div>;
}
