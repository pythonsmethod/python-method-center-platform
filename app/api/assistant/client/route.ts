import { NextResponse } from "next/server";
import { sanitizeChatMessages } from "@/lib/assistant/claude";
import { askAssistantTeam } from "@/lib/assistant/router";
import { buildClientSystemPrompt } from "@/lib/assistant/prompts";

export const runtime = "nodejs";

// Best-effort per-instance limiter for the public endpoint: serverless
// instances don't share state, so this only smooths bursts, not a hard cap.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const hits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;

  if (hits.size > 5000) {
    hits.clear();
  }

  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Слишком много сообщений подряд. Подождите минуту." },
      { status: 429 }
    );
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

  const system = await buildClientSystemPrompt();
  const result = await askAssistantTeam(system, messages, 700, "auto");

  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "ИИ-помощник ещё не подключён. Напишите нам через страницу «Поддержка»." },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ reply: result.reply });
}
