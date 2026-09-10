import { providerPolicyRefusal } from "@/lib/assistant/policy-refusal";
import { NextResponse } from "next/server";
import { conversationContext, type ConversationScope } from "@/lib/assistant/conversation-context";
import { withConversationArchive } from "@/lib/assistant/conversation-archive";
import { CLIENT_TOOLS_RULE } from "@/lib/assistant/client-tool-contract";
import { resolveVoiceActor } from "@/lib/assistant/realtime-server";
import { canUseClientTools } from "@/lib/assistant/client-case-tools";
import { webSourceAppendix } from "@/lib/assistant/web-results";
import { normalizeAnhamResponse } from "@/lib/assistant/response-style";
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
import { isExplicitOutreachRefusal, stopAssistantOutreach } from "@/lib/assistant/outreach";
import { resolveAssistantAudience, type AssistantTier } from "@/lib/assistant/tiers";
import { clientIp } from "@/lib/utils/client-ip";
import { guardFactualReply } from "@/lib/assistant/factual-honesty";
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
  const questionCreatedAt = new Date().toISOString();
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
  const latest = messages[messages.length - 1];
  if (audience.profileId && audience.tier !== "guest" && latest?.role === "user"
    && isExplicitOutreachRefusal(latest.content)) {
    // Persist a refusal before any provider/quota check. An AI outage must
    // never prevent a person from stopping unsolicited messages.
    try {
      await stopAssistantOutreach(audience.profileId);
    } catch {
      return NextResponse.json({ error: locale === "ru"
        ? "Не удалось отключить сообщения. Попробуйте ещё раз."
        : "Could not turn off messages. Please try again." }, { status: 503 });
    }
    const reply = locale === "ru"
      ? "Автоматические сообщения отключены. Вы можете написать мне сами, когда захотите."
      : "Automatic messages are off. You can still write to me whenever you like.";
    const persistence = await saveAssistantExchange({ profileId: audience.profileId, caseId: audience.caseId,
      tier: audience.tier, question: latest.content, answer: reply, locale, questionCreatedAt });
    return NextResponse.json({ reply, ...persistence });
  }
  const settings = TIER_SETTINGS[audience.tier];

  async function respondWithReply(rawReply: string) {
    const requestedLocale = (body as { locale?: unknown })?.locale;
    const reply = normalizeAnhamResponse(rawReply, requestedLocale === "ru" || requestedLocale === "en" ? requestedLocale : locale);
    if (!reply) return NextResponse.json({ error: apiError("assistantEmptyReply", locale) }, { status: 502 });
    const payload = body as { transient?: unknown; displayText?: unknown; locale?: unknown };
    const persistence = audience.profileId && audience.tier !== "guest" && payload.transient !== true
      ? await saveAssistantExchange({ profileId: audience.profileId, caseId: audience.caseId, tier: audience.tier, questionCreatedAt,
          question: typeof payload.displayText === "string" && payload.displayText.trim() ? payload.displayText : messages![messages!.length - 1].content,
          answer: reply, locale: payload.locale === "en" ? "en" : "ru" }) : undefined;
    return NextResponse.json({ reply, ...persistence });
  }


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
    return respondWithReply(apiError("attachmentsPaidOnly", locale));
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
    return respondWithReply(guard.message);
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

  if (audience.profileId && audience.tier !== "guest") {
    system += await conversationContext({ profileId: audience.profileId, private: false,
      caseId: audience.caseId ?? null }, messages[messages.length - 1].content);
  }

  // Interface-language hint: the assistant already mirrors the visitor's
  // language, this sets the default for short/ambiguous messages.
  const rawLocale = (body as { locale?: unknown })?.locale;
  const responseLocale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : locale;

  if (responseLocale === "en") {
    system += "\n\nActive interface language: English. Reply in English.";
  } else {
    system += "\n\nАктивный язык интерфейса: русский. Отвечай по-русски.";
  }

  if (attachments) {
    system += `\n\n${ATTACHMENT_READING_ACCURACY_RULE}`;
  }

  // Attached files go to Claude, which reads photos and PDFs directly;
  let clientTools: ConversationScope["clientTools"];
  if (audience.fullPreview) {
    try {
      const actor = await resolveVoiceActor(request, "client", audience.caseId);
      if (!canUseClientTools(actor) || actor.profileId !== audience.profileId || actor.caseId !== audience.caseId || !actor.email) throw new Error();
      clientTools = { email: actor.email, locale: responseLocale };
      system += `\n${CLIENT_TOOLS_RULE}`;
    } catch { return NextResponse.json({ error: responseLocale === "ru" ? "Нет доступа к тестовым возможностям. Войдите заново." : "Preview access is unavailable. Please sign in again." }, { status: 403 }); }
  }
  // the arbiter path is skipped rather than answering without seeing them.
  const result = await withConversationArchive(audience.profileId && audience.tier !== "guest"
    ? { profileId: audience.profileId, private: false, caseId: audience.caseId ?? null, clientTools } : null, async () => attachments
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
        ));

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
  if (result.refusal) result.reply = providerPolicyRefusal(rawLocale === "en" ? "en" : "ru").reply;

  return respondWithReply(guardFactualReply({
    reply: result.reply,
    question: messages[messages.length - 1]?.content ?? "",
    locale: rawLocale === "en" ? "en" : rawLocale === "ru" ? "ru" : locale,
    audience: "client"
  }) + (result.refusal ? "" : webSourceAppendix(clientTools?.webResults ?? [], responseLocale)));
}
