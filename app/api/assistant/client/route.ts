import { NextResponse } from "next/server";
import { sanitizeChatMessages } from "@/lib/assistant/claude";
import { askAssistantTeam } from "@/lib/assistant/router";
import { buildClientSystemPrompt } from "@/lib/assistant/prompts";
import { extractRedFlag, recordRedFlagEvent } from "@/lib/assistant/red-flags";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  let system = await buildClientSystemPrompt();

  // Interface-language hint: the assistant already mirrors the visitor's
  // language, this sets the default for short/ambiguous messages.
  const rawLocale = (body as { locale?: unknown })?.locale;

  if (rawLocale === "en") {
    system += "\n\n## Язык интерфейса посетителя\nПосетитель использует английскую версию сайта — по умолчанию отвечай на английском (если он пишет на другом языке, отвечай на его языке).";
  }

  // One agent for visitors: both models answer, the arbiter picks the
  // stronger reply. Degrades to single-model mode when only one key is set.
  const result = await askAssistantTeam(system, messages, 700, "best");

  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "ИИ-помощник ещё не подключён. Напишите нам через страницу «Поддержка»." },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  // Red-flag auto-capture: the assistant tags emergencies with a hidden
  // marker; we strip it and record an escalation_event for the team.
  const { cleanedReply, category } = extractRedFlag(result.reply);

  if (category) {
    let profileId: string | null = null;
    let profileEmail: string | null = null;

    try {
      const supabase = await createSupabaseServerClient();

      if (supabase) {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        profileId = user?.id ?? null;
        profileEmail = user?.email ?? null;
      }
    } catch {
      profileId = null;
    }

    try {
      await recordRedFlagEvent({
        category,
        messageExcerpt: messages[messages.length - 1]?.content ?? "",
        profileId,
        profileEmail
      });
    } catch (escalationError) {
      // Logging must never break the safety reply itself — but a silent
      // failure of the safety pipeline must still reach the team.
      await notifyTeam({
        kind: "processing_error",
        dedupeKey: `red-flag-pipeline-failed:${Date.now()}`,
        title: "ОШИБКА ОБРАБОТКИ: сбой конвейера красного флага",
        lines: [
          `Ошибка: ${
            escalationError instanceof Error
              ? escalationError.message
              : "неизвестно"
          }`,
          "Событие требует ручной проверки."
        ],
        link: adminLink()
      });
    }
  }

  return NextResponse.json({ reply: cleanedReply });
}
