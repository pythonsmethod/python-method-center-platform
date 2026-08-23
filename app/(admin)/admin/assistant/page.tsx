import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { KarenAnhamWorkspace } from "@/components/assistant/KarenAnhamWorkspace";
import { KnowledgePanel } from "@/components/assistant/KnowledgePanel";
import { listKnowledgeEntries } from "@/lib/assistant/knowledge";
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

  const configured = hasAssistantEnv();
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
    return <div className="page-shell page-shell--wide karen-ai-page"><KarenAnhamWorkspace configured={configured} labels={labels} showProviders={false} /></div>;
  }

  const knowledge = await listKnowledgeEntries();
  const t = locale === "ru" ? {
    eyebrow: "Персональный ИИ Анны",
    title: "ИИ основателя и общая база знаний",
    description: "Здесь Анна ставит задачи, развивает принципы платформы и вместе с Professor Python обучает клиентского Анхама.",
    chatLabel: "Рабочий диалог основателя",
    chatTitle: "Личный помощник Анны",
    intro: "Здравствуйте, Анна. Дайте мне задачу, идею или принцип — помогу довести его до сильного решения или знания для системы.",
    placeholder: "Напишите задачу, идею или правило…",
    suggestions: ["Помоги принять решение", "Преврати мою мысль в правило", "Подготовь задание для команды"],
    unavailable: "Личный помощник пока не подключён.",
    knowledgeLabel: "Общая память",
    knowledgeTitle: "База знаний Анны и Professor Python",
    knowledgeDescription: "Вы оба формируете эту память. Для каждого знания выберите, остаётся ли оно внутри или также обучает ИИ клиентов."
  } : {
    eyebrow: "Anna's personal AI",
    title: "Founder AI and shared knowledge base",
    description: "Anna assigns work, develops the platform's principles, and trains the client-facing Anham together with Professor Python.",
    chatLabel: "Founder workspace",
    chatTitle: "Anna's personal assistant",
    intro: "Hello, Anna. Give me a task, idea, or principle — I will help turn it into a strong decision or durable system knowledge.",
    placeholder: "Write a task, idea, or rule…",
    suggestions: ["Help me make a decision", "Turn my thought into a rule", "Prepare a task for the team"],
    unavailable: "The personal assistant is not connected yet.",
    knowledgeLabel: "Shared memory",
    knowledgeTitle: "Anna and Professor Python's knowledge base",
    knowledgeDescription: "You both shape this memory. For each entry, decide whether it stays internal or also trains the client-facing AI."
  };

  return <div className="page-shell page-shell--wide">
    <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
    <div className="karen-ai-grid">
      <section className="panel" aria-label={t.chatTitle}>
        <span className="panel__label">{t.chatLabel}</span>
        <h2 className="staff-assistant__title"><AnhamAvatar className="staff-assistant__face" size={44} state="client" />{t.chatTitle}</h2>
        {configured ? <AssistantChat attachments endpoint="/api/assistant/staff" intro={t.intro} placeholder={t.placeholder} providerChoice suggestions={t.suggestions} /> : <p className="form-message form-message--error">{t.unavailable}</p>}
      </section>
      <section className="panel" aria-label={t.knowledgeTitle}>
        <span className="panel__label">{t.knowledgeLabel}</span><h2>{t.knowledgeTitle}</h2><p>{t.knowledgeDescription}</p>
        <KnowledgePanel entries={knowledge.entries} loadError={knowledge.error} locale={locale} role="founder" />
      </section>
    </div>
  </div>;
}
