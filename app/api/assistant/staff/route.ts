import { NextResponse } from "next/server";
import { sanitizeChatMessages } from "@/lib/assistant/claude";
import {
  askAssistantTeam,
  isAssistantProvider
} from "@/lib/assistant/router";
import { buildStaffSystemPrompt } from "@/lib/assistant/prompts";
import { getStaffUserState } from "@/lib/auth/require-staff";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const messages = sanitizeChatMessages(
    (body as { messages?: unknown })?.messages
  );

  if (!messages) {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const rawProvider = (body as { provider?: unknown })?.provider;
  const provider = isAssistantProvider(rawProvider) ? rawProvider : "auto";

  const system = await buildStaffSystemPrompt();
  const result = await askAssistantTeam(
    system,
    messages,
    provider === "both" ? 1200 : 1500,
    provider
  );

  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "ИИ-помощник ещё не подключён: добавьте ANTHROPIC_API_KEY (Claude) и/или OPENAI_API_KEY (GPT) в переменные окружения." },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ reply: result.reply });
}
