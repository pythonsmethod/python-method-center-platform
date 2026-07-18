import { NextResponse } from "next/server";
import {
  askAssistant,
  sanitizeChatMessages
} from "@/lib/assistant/claude";
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

  const system = await buildStaffSystemPrompt();
  const result = await askAssistant(system, messages, 1500);

  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "ИИ-помощник ещё не подключён: добавьте ANTHROPIC_API_KEY в переменные окружения." },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ reply: result.reply });
}
