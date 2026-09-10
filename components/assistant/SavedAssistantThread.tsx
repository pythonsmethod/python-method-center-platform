import { formatDateTime } from "@/lib/i18n/format";
import type { AssistantHistoryMessage } from "@/lib/assistant/history";
import { VoiceWebResults } from "./VoiceWebResults";
import type { Locale } from "@/lib/i18n/locale";

type SavedAssistantThreadProps = {
  messages: AssistantHistoryMessage[];
  loadError?: string | null;
  emptyText: string;
  // Who is reading: the person themselves or the team.
  viewer: "client" | "staff";
  locale?: Locale;
};

// A read-only view of a conversation with the AI. Answering happens in the
// chat window itself; this is here so the same question is not asked twice.
export function SavedAssistantThread({
  messages,
  loadError = null,
  emptyText,
  viewer,
  locale = "ru"
}: SavedAssistantThreadProps) {
  if (loadError) {
    return <p className="empty-state">{loadError}</p>;
  }

  if (messages.length === 0) {
    return <p className="empty-state">{emptyText}</p>;
  }

  return (
    <div className="assistant-log">
      {messages.map((message) => (
        <div
          className={`assistant-msg assistant-msg--${message.role}`}
          key={message.id}
        >
          <span className="assistant-log__meta">
            {message.role === "user"
              ? viewer === "staff"
                ? locale === "ru" ? "Клиент" : "Client"
                : locale === "ru" ? "Вы" : "You"
              : locale === "ru" ? "ИИ-помощник" : "AI assistant"}{" "}
            · {formatDateTime(message.created_at, locale)}
            {message.source === "voice_transcript" ? (locale === "ru" ? " · Голос: непроверенная расшифровка" : " · Voice: unverified transcript") : null}
            {message.voice_state === "interrupted" ? (locale === "ru" ? " · Прервано: ответ мог прозвучать не полностью" : " · Interrupted: reply may not have been fully spoken") : null}
          </span>
          {message.content}
              {message.role === "assistant" ? <VoiceWebResults results={message.web_results} locale={locale} /> : null}
        </div>
      ))}
    </div>
  );
}
