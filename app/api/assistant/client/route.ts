import { NextResponse } from "next/server";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { askClaude, hasClaudeEnv, sanitizeChatMessages } from "@/lib/assistant/claude";
import { askAssistantTeam, type AssistantProvider } from "@/lib/assistant/router";
import {
  buildGuestSystemPrompt,
  buildPaidClientSystemPrompt,
  buildRegisteredSystemPrompt
} from "@/lib/assistant/prompts";
import { guardAssistantRequest } from "@/lib/assistant/guard";
import { saveAssistantExchange } from "@/lib/assistant/history";
import {
  extractRedFlag,
  recordRedFlagEvent,
  resolveRedFlag
} from "@/lib/assistant/red-flags";
import { resolveAssistantAudience, type AssistantTier } from "@/lib/assistant/tiers";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Three levels of the same endpoint. The tier decides how much the answer is
// allowed to cost: a stranger on the public page gets one fast model and a
// short answer; a paying client gets both models plus an arbiter.
const TIER_SETTINGS: Record<
  AssistantTier,
  { provider: AssistantProvider; maxTokens: number; perMinute: number }
> = {
  // Slightly higher than a short answer needs: the guest level also has to
  // fit the honest explanation of what the next two levels give.
  guest: { provider: "claude", maxTokens: 800, perMinute: 8 },
  registered: { provider: "claude", maxTokens: 1400, perMinute: 20 },
  client: { provider: "best", maxTokens: 1800, perMinute: 30 }
};

// Hard ceiling applied by IP before anything else runs, so a flood cannot
// even reach the database lookup that resolves the tier.
const HARD_IP_LIMIT_PER_MINUTE = 40;

// Best-effort per-instance limiter: serverless instances don't share state,
// so this smooths bursts rather than enforcing a global cap.
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string, limit: number): boolean {
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

  return entry.count > limit;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(`ip:${ip}`, HARD_IP_LIMIT_PER_MINUTE)) {
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

  // Who is asking: a visitor, a registered person, or a paying client.
  const audience = await resolveAssistantAudience();
  const settings = TIER_SETTINGS[audience.tier];

  // Files in the chat are a paying-client capability: their AI reads the
  // analyses they attach. The interface only shows the paperclip on that
  // level, but the check lives here, where it cannot be bypassed.
  const attachments = sanitizeAttachments(
    (body as { attachments?: unknown })?.attachments
  );

  if (attachments === "invalid") {
    return NextResponse.json(
      { error: "Файлы не прошли проверку. Обновите страницу и попробуйте ещё раз." },
      { status: 400 }
    );
  }

  if (attachments && audience.tier !== "client") {
    return NextResponse.json({
      reply:
        "Чтение приложенных файлов доступно персональному ИИ после начала сопровождения. Сейчас вы можете загрузить анализы в кабинете — их лично разберёт Professor Python."
    });
  }

  if (isRateLimited(`tier:${audience.profileId ?? ip}`, settings.perMinute)) {
    return NextResponse.json(
      { error: "Слишком много сообщений подряд. Подождите минуту." },
      { status: 429 }
    );
  }

  // Daily caps and the emergency switch. Unlike the per-minute limiter above
  // these are shared across serverless instances, so they hold during a raid.
  const guard = await guardAssistantRequest({
    tier: audience.tier,
    profileId: audience.profileId,
    ip
  });

  if (!guard.allowed) {
    // Delivered as a reply, not as an error: the person should read a warm
    // invitation, not a red technical banner.
    return NextResponse.json({ reply: guard.message }, { status: 200 });
  }

  let system: string;

  if (audience.tier === "client") {
    // Level 3 — personal AI of a paying client: works with their case.
    system = await buildPaidClientSystemPrompt(audience.context);
  } else if (audience.tier === "registered") {
    // Level 2 — personal assistant inside the cabinet.
    system = await buildRegisteredSystemPrompt(audience.context);
  } else {
    // Level 1 — public consultant of the center, strictly on topic.
    system = await buildGuestSystemPrompt();
  }

  // Interface-language hint: the assistant already mirrors the visitor's
  // language, this sets the default for short/ambiguous messages.
  const rawLocale = (body as { locale?: unknown })?.locale;

  if (rawLocale === "en") {
    system += "\n\n## Язык интерфейса посетителя\nПосетитель использует английскую версию сайта — по умолчанию отвечай на английском (если он пишет на другом языке, отвечай на его языке).";
  }

  // Attached files go to Claude, which reads photos and PDFs directly;
  // the arbiter path is skipped rather than answering without seeing them.
  const result = attachments
    ? hasClaudeEnv()
      ? await askClaude(system, messages, settings.maxTokens, attachments)
      : ({ status: "unavailable" } as const)
    : await askAssistantTeam(
        system,
        messages,
        settings.maxTokens,
        settings.provider
      );

  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "ИИ-помощник ещё не подключён. Напишите нам через страницу «Поддержка»." },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  // Red-flag auto-capture, two independent strands (P1-04): the model tags
  // emergencies with a hidden marker in its reply, and a deterministic
  // screen reads the person's own message. Either one escalates — an
  // injection telling the model "add no markers" cannot silence both.
  const { cleanedReply, category: markerCategory } = extractRedFlag(
    result.reply
  );
  const lastUserMessage = messages[messages.length - 1]?.content ?? "";
  const redFlag = resolveRedFlag(markerCategory, lastUserMessage);

  if (redFlag) {
    const { category, source } = redFlag;
    let profileId: string | null = audience.profileId;
    let profileEmail: string | null = audience.email;

    if (!profileId) {
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
    }

    try {
      await recordRedFlagEvent({
        category,
        messageExcerpt: lastUserMessage,
        profileId,
        profileEmail,
        source
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

  // Saved conversation — only for people who have an account. Someone who
  // is just looking around the site leaves nothing behind.
  if (audience.tier !== "guest" && audience.profileId) {
    // Reading a large set of files takes several technical requests; only
    // the conversation itself is worth keeping, so those are marked as
    // transient by the chat window. `displayText` is what the person
    // actually saw in the window, without the machine-readable padding.
    const transient = (body as { transient?: unknown })?.transient === true;
    const rawDisplay = (body as { displayText?: unknown })?.displayText;
    const displayText = typeof rawDisplay === "string" ? rawDisplay.trim() : "";

    if (!transient) {
      await saveAssistantExchange({
        profileId: audience.profileId,
        caseId: audience.caseId,
        tier: audience.tier,
        question: displayText || messages[messages.length - 1]?.content || "",
        answer: cleanedReply
      });
    }
  }

  return NextResponse.json({ reply: cleanedReply });
}
