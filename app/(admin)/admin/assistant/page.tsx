import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { KarenAnhamWorkspace } from "@/components/assistant/KarenAnhamWorkspace";
import { hasAssistantEnv } from "@/lib/assistant/router";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";

export default async function PrivateAssistantPage() {
  const auth = await getRequiredStaffUser("/admin/assistant");
  const locale = await getLocale();

  if (auth.status === "missing-env") return <div className="page-shell"><AuthSetupNotice title="Supabase Auth" /></div>;
  if (auth.status === "forbidden") notFound();
  if (auth.status === "error") return <div className="page-shell"><p className="form-message form-message--error">{auth.message}</p></div>;

  const assistantRole = auth.status === "authorized" ? resolvePrivateAssistantRole(auth.email) : null;
  if (!assistantRole) notFound();

  const configured = hasAssistantEnv() || Boolean(process.env.OPENAI_REALTIME_API_KEY?.trim());
  if (assistantRole === "karen") {
    const labels = locale === "ru" ? {
      back: "Вернуться обратно",
      chatTitle: "Анхам",
      intro: "Здравствуйте, Professor Python. Расскажите мне новый принцип, наблюдение или задачу — помогу оформить мысль, подготовить материал или решить рабочий вопрос.",
      placeholder: "Напишите мысль, правило или вопрос…",
      suggestions: ["Помоги сформулировать новый принцип", "Собери мои мысли в инструкцию", "Подготовь материал для клиента"],
      unavailable: "Персональный помощник пока не подключён. Обратитесь к администратору платформы."
    } : {
      back: "Go back",
      chatTitle: "Anham",
      intro: "Hello, Professor Python. Share a new principle, observation, or task — I can help shape the idea, prepare material, or solve a work question.",
      placeholder: "Write a thought, rule, or question…",
      suggestions: ["Help formulate a new principle", "Turn my thoughts into an instruction", "Prepare client material"],
      unavailable: "The personal assistant is not connected yet. Contact the platform administrator."
    };
    return <div className="page-shell page-shell--wide karen-ai-page"><KarenAnhamWorkspace configured={configured} labels={labels} locale={locale} showProviders={false} /></div>;
  }

  const t = locale === "ru" ? {
    eyebrow: "Персональный ИИ Анны",
    title: "Личный помощник Анны",
    description: "Общайтесь с Анхамом в одном окне. Чтобы добавить знание, напишите «Запомни: …» или «Сохрани это» после его ответа. Анхам также ищет нужные знания во всём архиве.",
    chatLabel: "Рабочий диалог основателя",
    chatTitle: "Личный помощник Анны",
    intro: "Здравствуйте, Анна. Дайте мне задачу, идею или принцип — помогу довести его до сильного решения или знания для системы.",
    placeholder: "Напишите задачу, идею или правило…",
    suggestions: ["Помоги принять решение", "Преврати мою мысль в правило", "Подготовь задание для команды"],
    unavailable: "Личный помощник пока не подключён.",
  } : {
    eyebrow: "Anna's personal AI",
    title: "Anna’s personal assistant",
    description: "Talk to Anham in one window. To add knowledge, write “Remember: …” or “Save this” after an answer. Anham also searches the entire knowledge archive.",
    chatLabel: "Founder workspace",
    chatTitle: "Anna's personal assistant",
    intro: "Hello, Anna. Give me a task, idea, or principle — I will help turn it into a strong decision or durable system knowledge.",
    placeholder: "Write a task, idea, or rule…",
    suggestions: ["Help me make a decision", "Turn my thought into a rule", "Prepare a task for the team"],
    unavailable: "The personal assistant is not connected yet.",
  };

  return <div className="page-shell page-shell--wide">
    <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
    <div className="anna-ai-workspace">
      <section className="panel" aria-label={t.chatTitle}>
        <span className="panel__label">{t.chatLabel}</span>
        <h2 className="staff-assistant__title"><AnhamAvatar className="staff-assistant__face" size={44} state="client" />{t.chatTitle}</h2>
        {configured ? <AssistantChat attachments endpoint="/api/assistant/staff" intro={t.intro} locale={locale} placeholder={t.placeholder} providerChoice suggestions={t.suggestions} /> : <p className="form-message form-message--error">{t.unavailable}</p>}
      </section>
    </div>
  </div>;
}
