import Link from "next/link";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";
import { getCaseMessages } from "@/lib/messages/queries";

export const dynamic = "force-dynamic";

export default async function ProfessorDialogPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale).cabinet;
  const auth = await getRequiredUser("/cabinet/dialog");

  if (auth.status === "missing-env") {
    return <section className="web-dialog"><header><span>{locale === "ru" ? "Личное сопровождение" : "Personal guidance"}</span><h1>Karen — Professor Python</h1><p>{locale === "ru" ? "Здесь будет ваша защищённая переписка с Professor Python." : "Your protected conversation with Professor Python will appear here."}</p></header></section>;
  }

  const result = await getClientCaseShell(auth.userId);
  const clientCase = result.status === "ready" ? result.case : null;
  if (!clientCase) {
    return <section className="web-dialog"><header><span>{locale === "ru" ? "Первый шаг" : "First step"}</span><h1>Karen — Professor Python</h1><p>{locale === "ru" ? "Сначала заполните анкету — она создаст ваш случай и откроет личный диалог." : "Complete the questionnaire first to create your case and open your personal conversation."}</p><Link className="button" href="/onboarding">{locale === "ru" ? "Заполнить анкету" : "Complete questionnaire"}</Link></header></section>;
  }

  const messages = await getCaseMessages(clientCase.id);
  return <section className="web-dialog">
    <header><span>{locale === "ru" ? "Защищённый диалог" : "Protected conversation"}</span><h1>Karen — Professor Python</h1><p>{locale === "ru" ? "Личная переписка по вашему случаю, материалам и следующим шагам." : "A private conversation about your case, materials, and next steps."}</p></header>
    <CaseMessageThread caseId={clientCase.id} dateLocale={dict.dateLocale} labels={dict.thread} loadError={messages.error} messages={messages.messages} viewer="client" voiceLabels={dict.voice} />
  </section>;
}
