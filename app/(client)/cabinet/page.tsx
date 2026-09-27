import Link from "next/link";
import { CabinetAnhamCard } from "@/components/cabinet/CabinetAnhamCard";
import { isClientVoicePilot } from "@/lib/assistant/client-voice-pilot";
import { IconAnkh, IconDjed, IconEyeOfHorus, IconWater } from "@/components/icons/EgyptianIcons";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { hasQuestionnaire } from "@/lib/health/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { getCaseMessages, getUnreadForClient } from "@/lib/messages/queries";
import { getClientSupportUnreadCount } from "@/lib/support/queries";

export const dynamic = "force-dynamic";

const copy = {
  ru: {
    eyebrow: "Связь с центром", title: "Мы рядом, когда вам это нужно",
    intro: "Выберите, с кем хотите продолжить диалог.",
    karen: "Karen — Professor Python", personal: "Личное сопровождение",
    preview: "Я изучаю ваши материалы. Если потребуется уточнение, напишу вам здесь.",
    previewBeforeIntake: "Сначала заполните анкету и добавьте материалы. После этого команда сможет изучить ваш случай и ответить здесь.",
    intakeFirst: "Сначала заполните анкету", startQuestionnaire: "Заполнить анкету",
    anhamBeforeIntake: "Анхам поможет разобраться, как заполнить анкету, добавить документы и пользоваться кабинетом. Это бесплатно и не заменяет личный разбор Professor Python.",
    newMessage: "Новые сообщения появятся здесь", continueDialog: "Продолжить диалог",
    caseTitle: "Мой случай", caseReview: "Материалы на рассмотрении",
    caseEmpty: "Заполните анкету, чтобы дополнить свой случай", openCase: "Открыть случай",
    appTitle: "Больше возможностей — в приложении",
    appText: "Ежедневная сводка, персональные напоминания и расширенные функции аккаунта доступны в приложении Python Method Center.",
    appCta: "Узнать о приложении", protected: "Защищённый диалог", askAnham: "Спросить Анхама",
    hqTitle: "Картина здоровья не заполнена",
    hqText: "Анализы не описывают человека. Расскажите своими словами, что вас беспокоит и что важно знать о вас — это читают вместе с вашими документами.",
    hqCta: "Заполнить картину здоровья",
    support: "Служба поддержки", supportPersonal: "Личная переписка с Анной",
    supportPreview: "Вопросы по аккаунту, оплате, доступу и работе сайта.",
    supportOpen: "Открыть поддержку", unread: "Непрочитанных сообщений"
  },
  en: {
    eyebrow: "Contact the center", title: "We are here when you need us",
    intro: "Choose who you would like to continue the conversation with.",
    karen: "Karen — Professor Python", personal: "Personal guidance",
    preview: "I am reviewing your materials. If I need any clarification, I will message you here.",
    previewBeforeIntake: "First complete the questionnaire and add your materials. The team can then review your case and reply here.",
    intakeFirst: "Complete the questionnaire first", startQuestionnaire: "Complete questionnaire",
    anhamBeforeIntake: "Anham can help you complete the questionnaire, add documents and use your account. It is free and does not replace Professor Python's personal review.",
    newMessage: "New messages will appear here", continueDialog: "Continue conversation",
    caseTitle: "My case", caseReview: "Materials under review",
    caseEmpty: "Complete the questionnaire to fill in your case", openCase: "Open case",
    appTitle: "More features in the app",
    appText: "Daily summaries, personal reminders, and expanded account features are available in the Python Method Center app.",
    appCta: "Learn about the app", protected: "Protected conversation", askAnham: "Ask Anham",
    hqTitle: "Your health picture is empty",
    hqText: "Test results do not describe a person. Tell us in your own words what troubles you and what matters about you — it is read alongside your documents.",
    hqCta: "Fill in the health picture",
    support: "Support", supportPersonal: "Private conversation with Anna",
    supportPreview: "Questions about your account, payments, access, and the website.",
    supportOpen: "Open support", unread: "Unread messages"
  }
} as const satisfies Record<Locale, object>;

export default async function CabinetPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const t = strings.cabinet.home;
  const c = copy[locale];
  const auth = await getRequiredUser("/cabinet");
  let hasCase = false;
  let caseHasIntake = false;
  let questionnaireFilled = true;
  let latestMessage: string | null = null;
  let professorUnread = 0;
  let supportUnread = 0;

  if (auth.status !== "missing-env") {
    questionnaireFilled = await hasQuestionnaire();
    const [caseResult, unreadSupport] = await Promise.all([
      getClientCaseShell(auth.userId),
      getClientSupportUnreadCount(auth.userId)
    ]);
    supportUnread = unreadSupport;
    const clientCase = caseResult.status === "ready" ? caseResult.case : null;
    hasCase = Boolean(clientCase);
    caseHasIntake = Boolean(clientCase?.title);
    if (clientCase) {
      const [messages, unreadProfessor] = await Promise.all([
        getCaseMessages(clientCase.id),
        getUnreadForClient(clientCase.id)
      ]);
      professorUnread = unreadProfessor;
      latestMessage = [...messages.messages].reverse().find((message) => message.sender_role !== "client" && message.body)?.body ?? null;
    }
  }

  return <div className="web-home">
    {auth.status !== "missing-env" && isClientVoicePilot(auth.email) ? <Link className="button" href="/cabinet/assistant">{locale === "ru" ? "Мой Анхам — попробовать голосовой разговор" : "My Anham — try a voice conversation"}</Link> : null}
    <header className="web-home__heading">
      <span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.intro}</p>
    </header>

    <div className="web-home__priority">
      <section className="contact-card contact-card--karen" aria-labelledby="karen-title">
        <div className="contact-card__head">
          <span className="contact-card__avatar"><IconEyeOfHorus /></span>
          <div><h2 id="karen-title">{c.karen}</h2><p>{c.personal}</p></div>
          {professorUnread > 0
            ? <b aria-label={`${c.unread}: ${professorUnread}`} className="unread-badge unread-badge--inline">{professorUnread}</b>
            : <span className="contact-card__lock" title={c.protected}>⌾</span>}
        </div>
        <blockquote>{latestMessage ?? (caseHasIntake ? c.preview : c.previewBeforeIntake)}</blockquote>
        <span className="contact-card__status"><i />{latestMessage ? c.protected : caseHasIntake ? c.newMessage : c.intakeFirst}</span>
        <Link className="contact-card__primary" href={caseHasIntake ? "/cabinet/dialog" : "/onboarding"}>{caseHasIntake ? c.continueDialog : c.startQuestionnaire}<span>→</span></Link>
      </section>

      <CabinetAnhamCard button={c.askAnham} label={t.inviteLabel} title={t.inviteTitle} text={caseHasIntake ? t.inviteText : c.anhamBeforeIntake} questions={t.inviteQuestions} boundary={t.inviteBoundary} />

      <section className="contact-card contact-card--support" aria-labelledby="support-title">
        <div className="contact-card__head">
          <span className="contact-card__avatar"><IconWater /></span>
          <div><h2 id="support-title">{c.support}</h2><p>{c.supportPersonal}</p></div>
          {supportUnread > 0
            ? <b aria-label={`${c.unread}: ${supportUnread}`} className="unread-badge unread-badge--inline">{supportUnread}</b>
            : null}
        </div>
        <p className="contact-card__anham-text">{c.supportPreview}</p>
        <span className="contact-card__status"><i />{supportUnread > 0 ? `${c.unread}: ${supportUnread}` : c.protected}</span>
        <Link className="contact-card__primary" href="/cabinet/chat">{c.supportOpen}<span>→</span></Link>
      </section>
    </div>

    {/* Shown only while it is empty, and gone the moment it is filled: a
        permanent banner is one a person stops seeing. */}
    {questionnaireFilled ? null : <Link className="hq-nudge" href="/cabinet/health">
      <span className="hq-nudge__icon"><IconDjed /></span>
      <span><strong>{c.hqTitle}</strong><small>{c.hqText}</small></span>
      <span className="hq-nudge__cta">{c.hqCta} →</span>
    </Link>}

    <div className="web-home__secondary">
      <Link className="case-shortcut" href={hasCase && caseHasIntake ? "/cabinet/account" : "/onboarding"}>
        <span className="case-shortcut__icon"><IconAnkh /></span>
        <span><small>{c.caseTitle}</small><strong>{caseHasIntake ? c.caseReview : c.caseEmpty}</strong></span>
        <span>{c.openCase} →</span>
      </Link>
      <aside className="web-app-promo">
        <span className="web-app-promo__phone" aria-hidden="true">▯</span>
        <span><strong>{c.appTitle}</strong><p>{c.appText}</p></span>
        <Link href="/welcome">{c.appCta} →</Link>
      </aside>
    </div>
  </div>;
}
