import { formatDateTime } from "@/lib/i18n/format";
import type { AssistantHistoryMessage } from "@/lib/assistant/history";

type SavedAssistantThreadProps = {
  messages: AssistantHistoryMessage[];
  loadError?: string | null;
  emptyText: string;
  // Who is reading: the person themselves or the team.
  viewer: "client" | "staff";
};

// A read-only view of a conversation with the AI. Answering happens in the
// chat window itself; this is here so the same question is not asked twice.
export function SavedAssistantThread({
  messages,
  loadError = null,
  emptyText,
  viewer
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
                ? "Клиент"
                : "Вы"
              : "ИИ-помощник"}{" "}
            · {formatDateTime(message.created_at)}
          </span>
          {message.content}
        </div>
      ))}
    </div>
  );
}
