import {
  askClaude,
  hasClaudeEnv,
  type AssistantResult,
  type ChatMessage
} from "@/lib/assistant/claude";
import { askOpenAi, hasOpenAiEnv } from "@/lib/assistant/openai";

// Both models share the same system prompt (rules + Karen's knowledge base),
// so they answer as one team. "auto" picks the primary model and quietly
// falls back to the other when the first is unavailable or errors out.
export type AssistantProvider = "auto" | "claude" | "gpt" | "both";

export function isAssistantProvider(value: unknown): value is AssistantProvider {
  return value === "auto" || value === "claude" || value === "gpt" || value === "both";
}

export function hasAssistantEnv(): boolean {
  return hasClaudeEnv() || hasOpenAiEnv();
}

async function askWithFallback(
  primary: "claude" | "gpt",
  system: string,
  messages: ChatMessage[],
  maxTokens: number
): Promise<AssistantResult> {
  const order =
    primary === "claude"
      ? ([askClaude, askOpenAi] as const)
      : ([askOpenAi, askClaude] as const);

  const first = await order[0](system, messages, maxTokens);

  if (first.status === "ok") {
    return first;
  }

  const second = await order[1](system, messages, maxTokens);

  if (second.status === "ok") {
    return second;
  }

  // Prefer the more informative outcome: a concrete error over "no keys".
  if (first.status === "error") {
    return first;
  }

  return second;
}

export async function askAssistantTeam(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  provider: AssistantProvider = "auto"
): Promise<AssistantResult> {
  if (!hasAssistantEnv()) {
    return { status: "unavailable" };
  }

  if (provider === "claude" || provider === "gpt") {
    return askWithFallback(provider, system, messages, maxTokens);
  }

  if (provider === "both") {
    const [claudeResult, gptResult] = await Promise.all([
      askClaude(system, messages, maxTokens),
      askOpenAi(system, messages, maxTokens)
    ]);

    const parts: string[] = [];

    if (claudeResult.status === "ok") {
      parts.push(`— Claude —\n${claudeResult.reply}`);
    }

    if (gptResult.status === "ok") {
      parts.push(`— GPT —\n${gptResult.reply}`);
    }

    if (parts.length === 0) {
      if (claudeResult.status === "error") {
        return claudeResult;
      }

      if (gptResult.status === "error") {
        return gptResult;
      }

      return { status: "unavailable" };
    }

    if (parts.length === 1) {
      const missing = claudeResult.status === "ok" ? "GPT" : "Claude";
      parts.push(`— ${missing} — сейчас недоступен, выше ответ одной модели.`);
    }

    return { status: "ok", reply: parts.join("\n\n") };
  }

  // "auto": Claude first when configured, otherwise GPT.
  return askWithFallback(hasClaudeEnv() ? "claude" : "gpt", system, messages, maxTokens);
}
