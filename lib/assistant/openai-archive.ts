import { aiFetch } from "@/lib/security/ai-transport";
import { assistantResponseFailure, parseOpenAiArchiveReply, type AssistantResult, type ChatMessage } from "./response-contract";
import { ARCHIVE_RULE, availableConversationTools, executeConversationArchiveTool } from "./conversation-archive";
import { isExplicitPolicyError, providerPolicyRefusal } from "./policy-refusal";

// Responses supports native tools together with reasoning. Store remains false;
// the application's archive, not a provider conversation ID, is authoritative.
export async function askOpenAiArchive(config: { apiKey: string; baseUrl: string; model: string; system: string; messages: ChatMessage[]; maxTokens: number; reasoningEffort?: "high" }): Promise<AssistantResult> {
  const input: Record<string, unknown>[] = [{ role: "system", content: `${config.system}\n${ARCHIVE_RULE}` }, ...config.messages.map(message => ({ ...message }))];
  let toolRounds = 0, continued = false, reply = "";
  try {
    for (;;) {
      const response = await aiFetch(`${config.baseUrl}/v1/responses`, {
        method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(60000),
        body: JSON.stringify({ model: config.model, store: false, input,
          include: ["reasoning.encrypted_content"], max_output_tokens: config.maxTokens,
          ...(config.reasoningEffort ? { reasoning: { effort: config.reasoningEffort } } : {}),
          tools: availableConversationTools().map(tool => ({ ...tool, strict: false })), tool_choice: toolRounds < 4 && !continued ? "auto" : "none" })
      });
      if (!response.ok) {
        if (await isExplicitPolicyError(response)) return providerPolicyRefusal();
        if (continued) return assistantResponseFailure("INCOMPLETE_RESPONSE");
        return { status: "error", code: response.status === 429 ? "overloaded" : "temporarilyDown", message: "Ассистент временно недоступен." };
      }
      const part = parseOpenAiArchiveReply(await response.json().catch(() => null));
      if (part.status === "refusal") return providerPolicyRefusal();
      if (part.status === "invalid") return assistantResponseFailure(continued ? "INCOMPLETE_RESPONSE" : "INVALID_RESPONSE");
      if (part.status === "tools") {
        const { calls } = part;
        if (toolRounds >= 4 || continued || calls.length > 3) throw new Error("tool budget");
        toolRounds++;
        input.push(...part.output);
        for (const call of calls) {
          let result: unknown;
          try {
            result = typeof call.arguments === "string" && call.arguments.length <= 2000
              ? await executeConversationArchiveTool(call.name, JSON.parse(call.arguments)) : { status: "invalid" };
          } catch { result = { status: "invalid" }; }
          input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
        }
        continue;
      }
      if (part.reply) reply += (reply ? "\n" : "") + part.reply;
      if (part.status === "incomplete") {
        if (continued) return assistantResponseFailure("INCOMPLETE_RESPONSE");
        continued = true;
        input.push(...part.output);
        input.push({ role: "user", content: "Finish the answer from the available sources in the active language. Do not repeat earlier text or invent missing facts." });
        continue;
      }
      return reply ? { status: "ok", reply } : { status: "error", code: "emptyReply", message: "Пустой ответ ассистента." };
    }
  } catch {
    if (continued) return assistantResponseFailure("INCOMPLETE_RESPONSE");
    return { status: "error", code: "unreachable", message: "Не удалось связаться с ассистентом." };
  }
}
