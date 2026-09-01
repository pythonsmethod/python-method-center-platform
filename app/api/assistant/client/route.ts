import { NextResponse } from "next/server";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { askClaude, hasClaudeEnv, sanitizeChatMessages } from "@/lib/assistant/claude";
import {
  askAnham,
  askAssistantTeam,
  chooseAnhamMode,
  type AssistantProvider
} from "@/lib/assistant/router";
import {
  ATTACHMENT_READING_ACCURACY_RULE,
  buildGuestSystemPrompt,
  buildPaidClientSystemPrompt,
  buildRegisteredSystemPrompt
} from "@/lib/assistant/prompts";
import {
  guardAnhamDeepRequest,
  guardAssistantRequest
} from "@/lib/assistant/guard";
import { saveAssistantExchange } from "@/lib/assistant/history";
import { resolveAssistantAudience, type AssistantTier } from "@/lib/assistant/tiers";
import { clientIp } from "@/lib/utils/client-ip";
import {
  apiError,
  apiErrorLocale,
  assistantFailure
} from "@/lib/i18n/api-errors";

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
  const locale = await apiErrorLocale();
  const ip = clientIp(request.headers);

  if (isRateLimited(`ip:${ip}`, HARD_IP_LIMIT_PER_MINUTE)) {
    return NextResponse.json(
      { error: apiError("rateLimited", locale) },
      { status: 429 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: apiError("badRequest", locale) }, { status: 400 });
  }

  const messages = sanitizeChatMessages(
    (body as { messages?: unknown })?.messages
  );

  if (!messages) {
    return NextResponse.json({ error: apiError("badRequest", locale) }, { status: 400 });
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
      { error: apiError("attachmentsRejected", locale) },
      { status: 400 }
    );
  }

  if (attachments && audience.tier !== "client") {
    return NextResponse.json({
      reply: apiError("attachmentsPaidOnly", locale)
    });
  }

  if (isRateLimited(`tier:${audience.profileId ?? ip}`, settings.perMinute)) {
    return NextResponse.json(
      { error: apiError("rateLimited", locale) },
      { status: 429 }
    );
  }

  // Daily caps and the emergency switch. Unlike the per-minute limiter above
  // these are shared across serverless instances, so they hold during a raid.
  const guard = await guardAssistantRequest({
    tier: audience.tier,
    profileId: audience.profileId,
    ip,
    locale: (body as { locale?: unknown })?.locale === "en" ? "en" : "ru"
  });

  if (!guard.allowed) {
    // Delivered as a reply, not as an error: the person should read a warm
    // invitation, not a red technical banner.
    return NextResponse.json({ reply: guard.message }, { status: 200 });
  }

  const requestedAnhamMode = audience.tier === "client"
    ? chooseAnhamMode(messages)
    : "standard";
  const anhamMode =
    requestedAnhamMode === "deep" && audience.profileId
      ? await guardAnhamDeepRequest(audience.profileId)
        ? "deep"
        : "standard"
      : requestedAnhamMode;

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

  if (attachments) {
    system += `\n\n${ATTACHMENT_READING_ACCURACY_RULE}`;
  }

  // Attached files go to Claude, which reads photos and PDFs directly;
  // the arbiter path is skipped rather than answering without seeing them.
  const result = attachments
    ? hasClaudeEnv()
      ? await askClaude(system, messages, 5000, attachments)
      : ({ status: "unavailable" } as const)
    : audience.tier === "client"
      ? await askAnham(system, messages, settings.maxTokens, anhamMode)
      : await askAssistantTeam(
          system,
          messages,
          settings.maxTokens,
          settings.provider
        );

  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: apiError("assistantUnavailable", locale) },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json(
      { error: assistantFailure(result, locale) },
      { status: 502 }
    );
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
        answer: result.reply,
        locale: rawLocale === "en" ? "en" : "ru"
      });
    }
  }

  return NextResponse.json({ reply: result.reply });
}
