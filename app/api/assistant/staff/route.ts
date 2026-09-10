import { NextResponse } from "next/server";
import { normalizeAnhamResponse } from "@/lib/assistant/response-style";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { askClaude, hasClaudeEnv, sanitizeChatMessages } from "@/lib/assistant/claude";
import { askAssistantTeam, askKarenAssistant } from "@/lib/assistant/router";
import { staffAssistantView } from "@/lib/assistant/staff-provider";
import { buildCaseContext } from "@/lib/assistant/case-context";
import { ATTACHMENT_READING_ACCURACY_RULE, buildStaffSystemPrompt } from "@/lib/assistant/prompts";
import { canSeeProviderNames } from "@/lib/auth/require-founder";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { isUuid } from "@/lib/utils/uuid";
import { apiError, apiErrorLocale, assistantFailure } from "@/lib/i18n/api-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const locale = await apiErrorLocale();
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return NextResponse.json({ error: apiError("accessDenied", locale) }, { status: 403 });
  }

  const assistantRole = resolvePrivateAssistantRole(auth.email);

  if (!assistantRole) {
    return NextResponse.json({ error: apiError("accessDenied", locale) }, { status: 403 });
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

  const attachments = sanitizeAttachments(
    (body as { attachments?: unknown })?.attachments
  );

  if (attachments === "invalid") {
    return NextResponse.json(
      {
        error: locale === "en"
          ? "Could not read the attachment. Photos, PDFs and text files are supported. Try sending a large set in two parts."
          : "Не удалось прочитать вложение. Поддерживаются фото, PDF и текстовые файлы. Если файлов очень много, попробуйте отправить их двумя частями."
      },
      { status: 400 }
    );
  }

  // A provider named in the request body is honoured only for the founder;
  // for everyone else the choice is made here and the name never comes back.
  const showProviders = canSeeProviderNames(auth.email);
  const { provider, attribution } = staffAssistantView(
    showProviders,
    (body as { provider?: unknown })?.provider
  );

  let system = await buildStaffSystemPrompt(assistantRole);
  const rawLocale = (body as { locale?: unknown })?.locale;
  const responseLocale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : locale;
  system += responseLocale === "en"
    ? "\n\nActive interface language: English. Reply in English."
    : "\n\nАктивный язык интерфейса: русский. Отвечай по-русски.";

  if (attachments) {
    system = `${system}\n\n${ATTACHMENT_READING_ACCURACY_RULE}`;
  }

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
  // Attachments go to the one provider that reads photos and PDFs directly.
  // The arbiter path is skipped for such a question rather than answering it
  // without seeing the file.
  const result = attachments
    ? hasClaudeEnv()
      ? await askClaude(system, messages, 5000, attachments)
      : ({
          status: "error" as const,
          message: showProviders
            ? locale === "en" ? "Claude reads files and photos. Add ANTHROPIC_API_KEY to the environment variables." : "Файлы и фото читает Claude. Добавьте ANTHROPIC_API_KEY в переменные окружения."
            : locale === "en" ? "The assistant cannot read files right now. Contact the founder to check the platform settings." : "Помощник сейчас не может читать файлы. Напишите основателю, чтобы проверить настройки платформы."
        })
    : showProviders && provider !== "best"
      ? await askAssistantTeam(
          system,
          messages,
          provider === "both" ? 1600 : 2200,
          provider,
          { attribution, deepReasoning: true, locale: responseLocale }
        )
      : await askKarenAssistant(system, messages, 2200);

  if (result.status === "unavailable") {
    return NextResponse.json(
      {
        error: showProviders
          ? locale === "en" ? "The assistant is not connected yet. Add ANTHROPIC_API_KEY (Claude) and/or OPENAI_API_KEY (GPT) to the environment variables." : "ИИ-помощник ещё не подключён: добавьте ANTHROPIC_API_KEY (Claude) и/или OPENAI_API_KEY (GPT) в переменные окружения."
          : locale === "en" ? "The assistant is not connected yet. Contact the founder to check the platform settings." : "ИИ-помощник ещё не подключён. Напишите основателю, чтобы проверить настройки платформы."
      },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json({ error: showProviders ? result.message : assistantFailure(result, locale) }, { status: 502 });
  }

  const reply = normalizeAnhamResponse(result.reply, responseLocale);
  return reply
    ? NextResponse.json({ reply })
    : NextResponse.json({ error: apiError("assistantEmptyReply", locale) }, { status: 502 });
}
