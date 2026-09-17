import { AnhamOpenButton } from "@/components/assistant/AnhamOpenButton";
import { SavedAssistantThread } from "@/components/assistant/SavedAssistantThread";
import { AuthSetupNotice } from "@/components/AuthSetupNotice";
import { PageHeader } from "@/components/PageHeader";
import { getOwnAssistantHistory } from "@/lib/assistant/history";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

export default async function CabinetAnhamPage() {
  const locale = await getLocale();
  const strings = getDictionary(locale);
  const auth = await getRequiredUser("/cabinet/anham");
  const ru = locale === "ru";

  if (auth.status === "missing-env") {
    return <div className="page-shell">
      <PageHeader eyebrow="Anham" title={ru ? "Переписка с Анхамом" : "Conversation with Anham"} />
      <AuthSetupNotice title={strings.cabinet.chat.setupNotice} labels={strings.setup} />
    </div>;
  }

  const history = await getOwnAssistantHistory(auth.userId, locale);

  return <>
    <PageHeader
      eyebrow={ru ? "ИИ-помощник" : "AI assistant"}
      title={ru ? "Переписка с Анхамом" : "Conversation with Anham"}
      description={ru
        ? "Здесь хранится ваша отдельная переписка с Анхамом. Сообщения Professor Python и службы поддержки находятся в соседних разделах."
        : "Your separate Anham conversation is kept here. Messages from Professor Python and Support are in their own sections."}
    />
    <section className="documents-section" aria-label={ru ? "Переписка с Анхамом" : "Conversation with Anham"}>
      <div className="panel">
        <SavedAssistantThread
          emptyText={ru ? "Вы ещё не общались с Анхамом." : "You have not talked with Anham yet."}
          loadError={history.status === "error" ? history.message : null}
          messages={history.status === "ready" ? history.messages : []}
          locale={locale}
          viewer="client"
        />
        <AnhamOpenButton className="button">
          {ru ? "Продолжить разговор с Анхамом" : "Continue with Anham"}
        </AnhamOpenButton>
      </div>
    </section>
  </>;
}
