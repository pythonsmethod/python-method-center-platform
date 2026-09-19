import { askOpenAi, hasOpenAiEnv } from "./openai";
import { askClaude, hasClaudeEnv, type AssistantResult, type ChatMessage } from "./claude";
import { withConversationArchive } from "./conversation-archive";
import { withLiveContext } from "./live-context";
import { withAuditChannel } from "@/lib/audit/log";
import { karenTextToolContext, KAREN_TEXT_RULES, type KarenTextActor } from "./karen-text-tools";

// One API-driven investigation. Configured provider adapters are implementation
// details; do not run two independent drafts plus a judge on every Karen turn.
// withLiveContext is a shared request-local tool carrier; it opens NO voice session.
export async function askKarenTextApi(system: string, messages: ChatMessage[], actor: KarenTextActor): Promise<AssistantResult> {
  return withAuditChannel("text", () => withConversationArchive({ profileId: actor.profileId, private: true, caseId: actor.caseId }, () =>
    withLiveContext(karenTextToolContext(actor), async () => {
      const instructions = `${system}\n\n${KAREN_TEXT_RULES}`;
      let primary: AssistantResult = { status: "unavailable" };
      if (hasOpenAiEnv()) {
        primary = await askOpenAi(instructions, messages, 8192, { reasoningEffort: "high" });
        // A refusal is a completed policy outcome, never a reason to try another model.
        if (primary.status === "ok") return primary;
      }
      if (!hasClaudeEnv()) return primary;
      const fallback = await askClaude(instructions, messages, 6000);
      if (fallback.status !== "ok" || fallback.refusal) return fallback;
      const notice = actor.locale === "ru"
        ? "Основной режим сейчас недоступен; ответ подготовлен в резервном режиме с той же доступной памятью и инструментами."
        : "The primary mode is unavailable; this answer was prepared in the fallback mode with the same available memory and tools.";
      return { ...fallback, reply: `${notice}\n\n${fallback.reply}` };
    })
  ));
}
