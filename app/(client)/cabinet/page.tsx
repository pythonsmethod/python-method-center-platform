import Link from "next/link";
import { CabinetAnhamCard } from "@/components/cabinet/CabinetAnhamCard";
import { IconAnkh, IconDjed, IconEyeOfHorus } from "@/components/icons/EgyptianIcons";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { hasQuestionnaire } from "@/lib/health/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { getCaseMessages } from "@/lib/messages/queries";

export const dynamic = "force-dynamic";

const copy = {
  ru: {
    eyebrow: "Связь с центром", title: "Мы рядом, когда вам это нужно",
    intro: "Выберите, с кем хотите продолжить диалог.",
    karen: "Karen — Professor Python", personal: "Личное сопровождение",
    preview: "Я изучаю ваши материалы. Если потребуется уточнение, напишу вам здесь.",
    newMessage: "Новые сообщения появятся здесь", continueDialog: "Продолжить диалог",
    caseTitle: "Мой случай", caseReview: "Материалы на рассмотрении",
    caseEmpty: "Заполните анкету, чтобы создать случай", openCase: "Открыть случай",
    appTitle: "Больше возможностей — в приложении",
    appText: "Ежедневная сводка, персональные напоминания и расширенные функции аккаунта доступны в приложении Python Method Center.",
    appCta: "Узнать о приложении", protected: "Защищённый диалог", askAnham: "Спросить Анхама",
    hqTitle: "Анкета здоровья не заполнена",
    hqText: "Анализы не описывают человека. Расскажите своими словами, что вас беспокоит и что важно знать о вас — это читают вместе с вашими документами.",
    hqCta: "Заполнить анкету"
  },
  en: {
    eyebrow: "Contact the center", title: "We are here when you need us",
    intro: "Choose who you would like to continue the conversation with.",
    karen: "Karen — Professor Python", personal: "Personal guidance",
    preview: "I am reviewing your materials. If I need any clarification, I will message you here.",
    newMessage: "New messages will appear here", continueDialog: "Continue conversation",
    caseTitle: "My case", caseReview: "Materials under review",
    caseEmpty: "Complete the questionnaire to create your case", openCase: "Open case",
    appTitle: "More features in the app",
    appText: "Daily summaries, personal reminders, and expanded account features are available in the Python Method Center app.",
    appCta: "Learn about the app", protected: "Protected conversation", askAnham: "Ask Anham",
    hqTitle: "Your health questionnaire is empty",
    hqText: "Test results do not describe a person. Tell us in your own words what troubles you and what matters about you — it is read alongside your documents.",
    hqCta: "Fill in the questionnaire"
  }
} as const satisfies Record<Locale, object>;

export default async function CabinetPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const t = strings.cabinet.home;
  const c = copy[locale];
  const auth = await getRequiredUser("/cabinet");
  let hasCase = false;
  let questionnaireFilled = true;
  let latestMessage: string | null = null;

  if (auth.status !== "missing-env") {
    questionnaireFilled = await hasQuestionnaire();
    const caseResult = await getClientCaseShell(auth.userId);
    const clientCase = caseResult.status === "ready" ? caseResult.case : null;
    hasCase = Boolean(clientCase);
    if (clientCase) {
      const messages = await getCaseMessages(clientCase.id);
      latestMessage = [...messages.messages].reverse().find((message) => message.sender_role !== "client" && message.body)?.body ?? null;
    }
  }

  return <div className="web-home">
    <header className="web-home__heading">
      <span>{c.eyebrow}</span><h1>{c.title}</h1><p>{c.intro}</p>
    </header>

    <div className="web-home__priority">
      <section className="contact-card contact-card--karen" aria-labelledby="karen-title">
        <div className="contact-card__head">
          <span className="contact-card__avatar"><IconEyeOfHorus /></span>
          <div><h2 id="karen-title">{c.karen}</h2><p>{c.personal}</p></div>
          <span className="contact-card__lock" title={c.protected}>⌾</span>
        </div>
        <blockquote>{latestMessage ?? c.preview}</blockquote>
        <span className="contact-card__status"><i />{latestMessage ? c.protected : c.newMessage}</span>
        <Link className="contact-card__primary" href="/cabinet/dialog">{c.continueDialog}<span>→</span></Link>
      </section>

      <CabinetAnhamCard button={c.askAnham} label={t.inviteLabel} title={t.inviteTitle} text={t.inviteText} questions={t.inviteQuestions} boundary={t.inviteBoundary} />
    </div>

    {/* Shown only while it is empty, and gone the moment it is filled: a
        permanent banner is one a person stops seeing. */}
    {questionnaireFilled ? null : <Link className="hq-nudge" href="/cabinet/health">
      <span className="hq-nudge__icon"><IconDjed /></span>
      <span><strong>{c.hqTitle}</strong><small>{c.hqText}</small></span>
      <span className="hq-nudge__cta">{c.hqCta} →</span>
    </Link>}

    <div className="web-home__secondary">
      <Link className="case-shortcut" href={hasCase ? "/cabinet/account" : "/onboarding"}>
        <span className="case-shortcut__icon"><IconAnkh /></span>
        <span><small>{c.caseTitle}</small><strong>{hasCase ? c.caseReview : c.caseEmpty}</strong></span>
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
