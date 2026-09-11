import { aiFetch } from "@/lib/security/ai-transport";
import type { AssistantResult, ChatMessage } from "./claude";
import { ARCHIVE_RULE, availableConversationTools, executeConversationArchiveTool } from "./conversation-archive";
import { isExplicitPolicyError, providerPolicyRefusal } from "./policy-refusal";

type Output = { type: string; call_id?: string; name?: string; arguments?: string; content?: { type: string; text?: string }[]; [key: string]: unknown };
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
        return { status: "error", code: response.status === 429 ? "overloaded" : "temporarilyDown", message: "Ассистент временно недоступен." };
      }
      const data = await response.json() as { status?: string; incomplete_details?: { reason?: string }; output?: Output[] };
      const output = data.output ?? [];
      if (output.some(item => item.content?.some(part => part.type === "refusal")) || data.incomplete_details?.reason === "content_filter") return providerPolicyRefusal();
      if (data.status === "failed" || data.status === "cancelled") throw new Error("response failed");
      const calls = output.filter(item => item.type === "function_call");
      input.push(...output);
      if (calls.length) {
        if (toolRounds >= 4 || continued || calls.length > 3) throw new Error("tool budget");
        toolRounds++;
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
      const text = output.flatMap(item => item.content ?? []).filter(part => part.type === "output_text").map(part => part.text ?? "").join("\n").trim();
      if (text) reply += (reply ? "\n" : "") + text;
      if (data.status === "incomplete" && data.incomplete_details?.reason === "max_output_tokens" && !continued) {
        continued = true;
        input.push({ role: "user", content: "Finish the answer from the available sources in the active language. Do not repeat earlier text or invent missing facts." });
        continue;
      }
      return reply ? { status: "ok", reply } : { status: "error", code: "emptyReply", message: "Пустой ответ ассистента." };
    }
  } catch { return { status: "error", code: "unreachable", message: "Не удалось связаться с ассистентом." }; }
}
