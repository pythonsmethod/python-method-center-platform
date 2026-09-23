// Application-owned types. Legacy adapter exports remain as compatibility aliases.
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AssistantErrorCode = "overloaded" | "temporarilyDown" | "unreachable" | "emptyReply" | "INVALID_RESPONSE" | "INCOMPLETE_RESPONSE";
export type AssistantResult =
  | { status: "ok"; reply: string; refusal?: "provider_policy" }
  | { status: "unavailable" }
  | { status: "error"; message: string; code?: AssistantErrorCode };

type ReplyPart =
  | { status: "complete"; reply: string }
  | { status: "incomplete"; reply: string }
  | { status: "invalid" }
  | { status: "refusal" };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

export function parseOpenAiReply(value: unknown): ReplyPart {
  const data = record(value);
  if (!Array.isArray(data?.choices) || data.choices.length !== 1) return { status: "invalid" };
  const choice = record(data.choices[0]);
  const message = record(choice?.message);
  if (choice?.finish_reason === "content_filter" || message?.refusal) return { status: "refusal" };
  if (message?.role !== undefined && message.role !== "assistant") return { status: "invalid" };
  if (message?.tool_calls || message?.function_call) return { status: "invalid" };
  if (typeof message?.content !== "string" || !message.content.trim()) return { status: "invalid" };
  if (choice?.finish_reason !== "stop" && choice?.finish_reason !== "length") return { status: "invalid" };
  return { status: choice.finish_reason === "stop" ? "complete" : "incomplete", reply: message.content.trim() };
}

export function parseClaudeReply(value: unknown): ReplyPart {
  const data = record(value);
  if (data?.stop_reason === "refusal") return { status: "refusal" };
  if (!Array.isArray(data?.content) || data.content.length === 0) return { status: "invalid" };
  if (data.role !== undefined && data.role !== "assistant") return { status: "invalid" };
  if (data.stop_reason !== "end_turn" && data.stop_reason !== "max_tokens") return { status: "invalid" };
  const text: string[] = [];
  for (const item of data.content) {
    const block = record(item);
    // Archive tool turns are handled before this final-text boundary. Never
    // silently drop an unexpected block and publish a partial final answer.
    if (block?.type !== "text" || typeof block.text !== "string") return { status: "invalid" };
    text.push(block.text);
  }
  const reply = text.join("\n").trim();
  return reply ? { status: data.stop_reason === "end_turn" ? "complete" : "incomplete", reply } : { status: "invalid" };
}

export function assistantResponseFailure(code: AssistantErrorCode): Extract<AssistantResult, { status: "error" }> {
  return { status: "error", code, message: code === "INCOMPLETE_RESPONSE" ? "Помощник не смог закончить ответ." : "Помощник не смог ответить." };
}

type ArchiveCall = { type: "function_call"; call_id: string; name: string; arguments: string };
type ArchiveReply =
  | { status: "invalid" }
  | { status: "refusal" }
  | { status: "tools"; output: Record<string, unknown>[]; calls: ArchiveCall[] }
  | { status: "complete" | "incomplete"; output: Record<string, unknown>[]; reply: string };

// Only the existing archive protocol is accepted: encrypted reasoning,
// authorized function calls, and assistant text. Parsing never grants access.
export function parseOpenAiArchiveReply(value: unknown): ArchiveReply {
  const data = record(value);
  const reason = record(data?.incomplete_details)?.reason;
  if (reason === "content_filter") return { status: "refusal" };
  if (!Array.isArray(data?.output)) return { status: "invalid" };
  const output: Record<string, unknown>[] = [];
  for (const item of data.output) {
    const row = record(item);
    if (!row) return { status: "invalid" };
    output.push(row);
  }
  if (output.some(item => Array.isArray(item.content) && item.content.some(part => record(part)?.type === "refusal"))) return { status: "refusal" };
  if (data.status !== "completed" && !(data.status === "incomplete" && reason === "max_output_tokens")) return { status: "invalid" };
  const calls: ArchiveCall[] = [];
  const text: string[] = [];
  for (const item of output) {
    if (item.type === "reasoning") continue;
    if (item.type === "function_call") {
      if (data.status !== "completed" || (item.status !== undefined && item.status !== "completed") ||
          typeof item.call_id !== "string" || !item.call_id.trim() ||
          typeof item.name !== "string" || !item.name.trim() || typeof item.arguments !== "string" ||
          calls.some(call => call.call_id === item.call_id)) return { status: "invalid" };
      calls.push({ type: "function_call", call_id: item.call_id, name: item.name, arguments: item.arguments });
      continue;
    }
    if (item.type !== "message" || (item.role !== undefined && item.role !== "assistant") ||
        (item.status !== undefined && item.status !== "completed" && !(data.status === "incomplete" && item.status === "incomplete")) ||
        !Array.isArray(item.content)) return { status: "invalid" };
    for (const part of item.content) {
      const block = record(part);
      if (block?.type !== "output_text" || typeof block.text !== "string") return { status: "invalid" };
      text.push(block.text);
    }
  }
  if (calls.length) return { status: "tools", output, calls };
  const reply = text.join("\n").trim();
  // A reasoning-only token limit may be continued once; it is never success.
  if (data.status === "incomplete") return { status: "incomplete", output, reply };
  return reply ? { status: "complete", output, reply } : { status: "invalid" };
}
