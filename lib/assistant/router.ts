import {
  askClaude,
  hasClaudeEnv,
  type AssistantResult,
  type ChatMessage
} from "@/lib/assistant/claude";
import { askOpenAi, hasOpenAiEnv } from "@/lib/assistant/openai";

// Both models share the same system prompt (rules + Karen's knowledge base),
// so they answer as one team.
// - "auto": one primary model, silent failover to the other.
// - "best": both answer in parallel, an arbiter picks the stronger reply,
//   the user sees a single answer (falls back to "auto" with one key).
// - "both": both replies shown side by side (Karen's comparison mode).
export type AssistantProvider = "auto" | "best" | "claude" | "gpt" | "both";

const PROVIDERS: readonly AssistantProvider[] = [
  "auto",
  "best",
  "claude",
  "gpt",
  "both"
];

export function isAssistantProvider(value: unknown): value is AssistantProvider {
  return PROVIDERS.includes(value as AssistantProvider);
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

const JUDGE_EXCERPT_CHARS = 2400;

// Arbiter: given the client's question and both replies, pick the stronger
// one. Judged by whichever provider is available (Claude preferred); any
// arbiter failure falls back to the Claude reply rather than breaking chat.
async function pickStrongerReply(
  messages: ChatMessage[],
  claudeReply: string,
  gptReply: string
): Promise<"claude" | "gpt"> {
  const question = messages[messages.length - 1]?.content.slice(0, 1500) ?? "";

  const judgeSystem =
    "Ты — строгий арбитр качества ответов ассистента цифрового реабилитационного центра. Сравни два ответа на вопрос и выбери более сильный по критериям: точность и отсутствие выдумок; безопасность (никаких диагнозов, назначений лечения, обещаний результата); соответствие вопросу; ясность и теплота; краткость без потери смысла. Ответь строго одной буквой: A или B. Никакого другого текста.";

  const judgeQuestion = `Вопрос:\n${question}\n\nОтвет A:\n${claudeReply.slice(0, JUDGE_EXCERPT_CHARS)}\n\nОтвет B:\n${gptReply.slice(0, JUDGE_EXCERPT_CHARS)}\n\nКакой ответ сильнее? Ответь одной буквой: A или B.`;
  const judgeMessages: ChatMessage[] = [
    { role: "user", content: judgeQuestion }
  ];

  const verdict = hasClaudeEnv()
    ? await askClaude(judgeSystem, judgeMessages, 8)
    : await askOpenAi(judgeSystem, judgeMessages, 8);

  if (verdict.status === "ok" && verdict.reply.trim().toUpperCase().startsWith("B")) {
    return "gpt";
  }

  return "claude";
}

export async function askAssistantTeam(
  system: string,
  messages: ChatMessage[],
  maxTokens: number,
  provider: AssistantProvider = "auto",
  options: { attribution?: boolean } = {}
): Promise<AssistantResult> {
  if (!hasAssistantEnv()) {
    return { status: "unavailable" };
  }

  if (provider === "claude" || provider === "gpt") {
    return askWithFallback(provider, system, messages, maxTokens);
  }

  if (provider === "best") {
    if (!hasClaudeEnv() || !hasOpenAiEnv()) {
      return askWithFallback(
        hasClaudeEnv() ? "claude" : "gpt",
        system,
        messages,
        maxTokens
      );
    }

    const [claudeResult, gptResult] = await Promise.all([
      askClaude(system, messages, maxTokens),
      askOpenAi(system, messages, maxTokens)
    ]);

    if (claudeResult.status !== "ok" && gptResult.status !== "ok") {
      return claudeResult.status === "error" ? claudeResult : gptResult;
    }

    if (claudeResult.status !== "ok" || gptResult.status !== "ok") {
      return claudeResult.status === "ok" ? claudeResult : gptResult;
    }

    const winner = await pickStrongerReply(
      messages,
      claudeResult.reply,
      gptResult.reply
    );
    const reply = winner === "claude" ? claudeResult.reply : gptResult.reply;

    if (options.attribution) {
      const label = winner === "claude" ? "Claude" : "GPT";

      return {
        status: "ok",
        reply: `${reply}\n\n· Ответил ${label} (выбран арбитром как более сильный)`
      };
    }

    return { status: "ok", reply };
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
