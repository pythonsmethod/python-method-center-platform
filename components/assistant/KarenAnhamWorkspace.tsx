"use client";

import Link from "next/link";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import type { Locale } from "@/lib/i18n/locale";

type WorkspaceLabels = {
  back: string;
  chatTitle: string;
  intro: string;
  placeholder: string;
  suggestions: string[];
  unavailable: string;
};

type KarenAnhamWorkspaceProps = {
  configured: boolean;
  labels: WorkspaceLabels;
  locale: Locale;
  showProviders: boolean;
};

export function KarenAnhamWorkspace({
  configured,
  labels,
  locale,
  showProviders
}: KarenAnhamWorkspaceProps) {
  return (
    <section className="karen-anham-workspace" aria-label={labels.chatTitle}>
      <div className="karen-anham-workspace__bar">
        <Link className="karen-anham-workspace__back" href="/admin">← {labels.back}</Link>
        <div className="karen-anham-workspace__identity">
          <AnhamAvatar size={42} state="client" />
          <strong>{labels.chatTitle}</strong>
        </div>
      </div>

      <div className="karen-anham-workspace__chat">
        {configured ? (
          <AssistantChat
            attachments
            endpoint="/api/assistant/staff"
            intro={labels.intro}
            locale={locale}
            memoryCapture
            placeholder={labels.placeholder}
            providerChoice={showProviders}
            suggestions={labels.suggestions}
          />
        ) : <p aria-live="assertive" className="form-message form-message--error" role="alert">{labels.unavailable}</p>}
      </div>
    </section>
  );
}
