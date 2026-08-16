import { formatDateTime } from "@/lib/i18n/format";
import type { AssistantHistoryMessage } from "@/lib/assistant/history";
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
          </span>
          {message.content}
        </div>
      ))}
    </div>
  );
}
