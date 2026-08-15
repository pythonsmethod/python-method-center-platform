import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { KnowledgePanel } from "@/components/assistant/KnowledgePanel";
import { listKnowledgeEntries } from "@/lib/assistant/knowledge";
import { hasAssistantEnv } from "@/lib/assistant/router";
import { canSeeProviderNames } from "@/lib/auth/require-founder";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";
import { getLocale } from "@/lib/i18n/locale";

export default async function KarenAssistantPage() {
  const auth = await getRequiredStaffUser("/admin/assistant");
  const locale = await getLocale();

  if (auth.status === "missing-env") {
    return <div className="page-shell"><AuthSetupNotice title="Supabase Auth" /></div>;
  }
  if (auth.status === "forbidden") notFound();
  if (auth.status === "error") {
    return <div className="page-shell"><p className="form-message form-message--error">{auth.message}</p></div>;
  }

  const knowledge = await listKnowledgeEntries();
  const configured = hasAssistantEnv();
  const showProviders = canSeeProviderNames(auth.email);
  const t = locale === "ru"
    ? {
        eyebrow: "Персональный ИИ Карена",
        title: "ИИ и база знаний",
        description: "Здесь Карен общается со своим помощником и постепенно передаёт ему собственные принципы, наблюдения и методику.",
        chatLabel: "Рабочий диалог",
        chatTitle: "Персональный помощник",
        intro: "Здравствуйте, Professor Python. Расскажите мне новый принцип, наблюдение или задачу — помогу оформить мысль, подготовить материал или решить рабочий вопрос.",
        placeholder: "Напишите мысль, правило или вопрос…",
        suggestions: ["Помоги сформулировать новый принцип", "Собери мои мысли в инструкцию", "Подготовь материал для клиента"],
        unavailable: "Персональный помощник пока не подключён. Обратитесь к администратору платформы.",
        knowledgeLabel: "Память помощника",
        knowledgeTitle: "База знаний Карена",
        knowledgeDescription: "Сохранённые здесь знания становятся постоянной памятью ИИ. Карен может добавлять новые правила и при необходимости временно выключать их."
      }
    : {
        eyebrow: "Karen's personal AI",
        title: "AI and knowledge base",
        description: "Karen talks to his assistant here and gradually teaches it his principles, observations, and method.",
        chatLabel: "Work conversation",
        chatTitle: "Personal assistant",
        intro: "Hello, Professor Python. Share a new principle, observation, or task — I can help shape the idea, prepare material, or solve a work question.",
        placeholder: "Write a thought, rule, or question…",
        suggestions: ["Help formulate a new principle", "Turn my thoughts into an instruction", "Prepare client material"],
        unavailable: "The personal assistant is not connected yet. Contact the platform administrator.",
        knowledgeLabel: "Assistant memory",
        knowledgeTitle: "Karen's knowledge base",
        knowledgeDescription: "Knowledge saved here becomes the AI's long-term memory. Karen can add new rules and temporarily disable them when needed."
      };

  return (
    <div className="page-shell page-shell--wide karen-ai-page">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="karen-ai-grid">
        <section className="panel" aria-label={t.chatTitle}>
          <span className="panel__label">{t.chatLabel}</span>
          <h2 className="staff-assistant__title">
            <AnhamAvatar className="staff-assistant__face" size={44} state="client" />
            {t.chatTitle}
          </h2>
          {configured ? (
            <AssistantChat
              attachments
              endpoint="/api/assistant/staff"
              intro={t.intro}
              placeholder={t.placeholder}
              providerChoice={showProviders}
              suggestions={t.suggestions}
            />
          ) : <p className="form-message form-message--error">{t.unavailable}</p>}
        </section>

        <section className="panel" aria-label={t.knowledgeTitle}>
          <span className="panel__label">{t.knowledgeLabel}</span>
          <h2>{t.knowledgeTitle}</h2>
          <p>{t.knowledgeDescription}</p>
          <KnowledgePanel entries={knowledge.entries} loadError={knowledge.error} locale={locale} />
        </section>
      </div>
    </div>
  );
}
