import { NextResponse } from "next/server";
import { sanitizeChatMessages } from "@/lib/assistant/claude";
import {
  askAssistantTeam,
  isAssistantProvider
} from "@/lib/assistant/router";
import { buildCaseContext } from "@/lib/assistant/case-context";
import { buildStaffSystemPrompt } from "@/lib/assistant/prompts";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { isUuid } from "@/lib/utils/uuid";

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

  let system = await buildStaffSystemPrompt();

  // Optional case binding: the assistant on a case page receives a live
  // snapshot of that case from the database (metadata, questionnaire,
  // documents list, payments, history).
  const rawCaseId = (body as { caseId?: unknown })?.caseId;

  if (typeof rawCaseId === "string" && isUuid(rawCaseId)) {
    const caseContext = await buildCaseContext(rawCaseId);

    if (caseContext) {
      system = `${system}\n\n${caseContext}`;
    }
  }
  const result = await askAssistantTeam(
    system,
    messages,
    provider === "both" ? 1200 : 1500,
    provider,
    { attribution: provider === "best" }
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
