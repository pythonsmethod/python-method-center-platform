export type ContextMessage = {
  role: "user" | "assistant";
  content: string;
};

// The chat window can hold a long saved conversation, but only the recent
// part is sent to the model: older messages cost money on every question and
// rarely change the answer. Stays at or below MAX_HISTORY_MESSAGES in
// lib/assistant/claude.ts, which is where the server trims again.
export const MODEL_CONTEXT_MESSAGES = 12;

// The server rejects a thread that does not start with a person's message,
// so the cut is moved forward until it does.
export function contextWindow(history: ContextMessage[]): ContextMessage[] {
  const tail = history.slice(-MODEL_CONTEXT_MESSAGES);
  const start = tail.findIndex((message) => message.role === "user");

  return start > 0 ? tail.slice(start) : tail;
}
