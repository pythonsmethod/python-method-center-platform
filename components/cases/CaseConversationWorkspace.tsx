"use client";

import { useState } from "react";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { CaseMessageThread } from "@/components/messages/CaseMessageThread";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import type { CaseMessage } from "@/lib/messages/queries";

type Copy = {
  conversationLabel: string;
  conversationTitle: string;
  conversationHint: string;
  assistantLabel: string;
  assistantTitle: string;
  assistantHint: string;
  assistantIntro: string;
  assistantPlaceholder: string;
  suggestions: string[];
  useReply: string;
  replyUsed: string;
  reviewBeforeSending: string;
};

type Props = {
  caseId: string;
  copy: Copy;
  dateLocale: string;
  labels: Dictionary["cabinet"]["thread"];
  loadError: string | null;
  locale: Locale;
  messages: CaseMessage[];
  providerChoice: boolean;
  voiceLabels: Dictionary["cabinet"]["voice"];
};

export function CaseConversationWorkspace({
  caseId,
  copy,
  dateLocale,
  labels,
  loadError,
  locale,
  messages,
  providerChoice,
  voiceLabels
}: Props) {
  const [draft, setDraft] = useState<{ id: number; text: string } | null>(null);

  return (
    <div className="case-conversation-workspace">
      <section className="panel" aria-label={copy.assistantLabel}>
        <span className="panel__label">{copy.assistantLabel}</span>
        <h2 className="staff-assistant__title">
          <AnhamAvatar className="staff-assistant__face" size={44} state="client" />
          {copy.assistantTitle}
        </h2>
        <p>{copy.assistantHint}</p>
        <AssistantChat
          attachments
          caseId={caseId}
          endpoint="/api/assistant/staff"
          intro={copy.assistantIntro}
          locale={locale}
          onUseReply={(text) => setDraft({ id: Date.now(), text })}
          placeholder={copy.assistantPlaceholder}
          providerChoice={providerChoice}
          replyUsedLabel={copy.replyUsed}
          suggestions={copy.suggestions}
          useReplyLabel={copy.useReply}
        />
      </section>

      <section className="panel" aria-label={copy.conversationTitle}>
        <span className="panel__label">{copy.conversationLabel}</span>
        <h2>{copy.conversationTitle}</h2>
        <p>{copy.conversationHint}</p>
        {draft ? <p className="case-conversation-workspace__notice">{copy.reviewBeforeSending}</p> : null}
        <CaseMessageThread
          caseId={caseId}
          dateLocale={dateLocale}
          expandable
          externalDraft={draft}
          labels={labels}
          loadError={loadError}
          messages={messages}
          viewer="staff"
          voiceLabels={voiceLabels}
        />
      </section>
    </div>
  );
}
