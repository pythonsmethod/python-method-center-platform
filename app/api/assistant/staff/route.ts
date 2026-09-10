import { providerPolicyRefusal } from "@/lib/assistant/policy-refusal";
import { NextResponse } from "next/server";
import { normalizeAnhamResponse } from "@/lib/assistant/response-style";
import { searchKnowledgeArchive } from "@/lib/assistant/knowledge-search";
import { founderMemoryFromCommand } from "@/lib/assistant/founder-memory";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { askClaude, hasClaudeEnv, sanitizeChatMessages } from "@/lib/assistant/claude";
import { askAssistantTeam, askKarenAssistant } from "@/lib/assistant/router";
import { staffAssistantView } from "@/lib/assistant/staff-provider";
import { buildCaseContext } from "@/lib/assistant/case-context";
import { ATTACHMENT_READING_ACCURACY_RULE, buildStaffSystemPrompt } from "@/lib/assistant/prompts";
import { canSeeProviderNames } from "@/lib/auth/require-founder";
import { getPrivateAssistantUserState as getStaffUserState } from "@/lib/auth/require-private-assistant";
import { isAssistantDelegate } from "@/lib/auth/assistant-delegates";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { isUuid } from "@/lib/utils/uuid";
import { guardFactualReply } from "@/lib/assistant/factual-honesty";
import { apiError, apiErrorLocale, assistantFailure } from "@/lib/i18n/api-errors";

import { saveAssistantExchange } from "@/lib/assistant/history";
import { memoryCollectionFromCommand } from "@/lib/assistant/memory";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const locale = await apiErrorLocale();
  const questionCreatedAt = new Date().toISOString();
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

  const rawCaseId = (body as { caseId?: unknown })?.caseId;
  const respondWithReply = async (rawReply: string) => {
    const requestedLocale = (body as { locale?: unknown })?.locale;
    const reply = normalizeAnhamResponse(rawReply, requestedLocale === "ru" || requestedLocale === "en" ? requestedLocale : locale);
    if (!reply) return NextResponse.json({ error: apiError("assistantEmptyReply", locale) }, { status: 502 });
    const payload = body as { transient?: unknown; displayText?: unknown; locale?: unknown };
    const persistence = payload.transient === true ? {} : await saveAssistantExchange({
      profileId: auth.userId,
      questionCreatedAt,
      caseId: typeof rawCaseId === "string" && isUuid(rawCaseId) ? rawCaseId : null,
      tier: assistantRole,
      question: typeof payload.displayText === "string" && payload.displayText.trim()
        ? payload.displayText : messages[messages.length - 1].content,
      answer: reply,
      locale: payload.locale === "en" ? "en" : "ru"
    });
    return NextResponse.json({ reply, ...persistence });
  };

  const english = (body as { locale?: unknown })?.locale === "en";
  if ((body as { memoryConfirmation?: unknown })?.memoryConfirmation === true && !attachments && memoryCollectionFromCommand(messages[messages.length - 1].content)) {
    return respondWithReply(english
      ? "I prepared this for saving. Please confirm below what to do: save it to the method, the book, client-answer memory, or do not save it."
      : "Я подготовил это к сохранению. Подтвердите ниже, что именно сделать: сохранить в метод, в книгу, в память ответов клиентам или не сохранять.");
  }

  const memory = assistantRole === "founder" ? founderMemoryFromCommand(messages, english) : null;
  if (memory && isAssistantDelegate(auth.email)) memory.title = `${english ? "Assistant note" : "Заметка помощника"}: ${memory.content.split(/\r?\n/)[0]}`.slice(0, 200);
  if (memory) {
    if (attachments || !memory.content || memory.content.length > 8000) {
      return respondWithReply(english
        ? "Please write the text after ‘Remember:’. To save my previous answer, write ‘Save this’ without attachments."
        : "Напишите текст после «Запомни:». Чтобы сохранить мой предыдущий ответ, напишите «Сохрани это» без вложений.");
    }
    try {
      const supabase = createSupabaseServiceClient();
      if (!supabase) throw new Error("unavailable");
      const { error } = await supabase.from("assistant_knowledge").insert({
        ...memory, audience: "staff", collection: "general", topic: "general", created_by: auth.userId
      });
      if (error) throw new Error("save failed");
      return respondWithReply((english
        ? "Saved to internal assistant memory:\n\n"
        : "Сохранено во внутреннюю память помощника:\n\n") + memory.content);
    } catch {
      return NextResponse.json({ error: english
        ? "Could not save the note. Please try again."
        : "Не удалось сохранить заметку. Попробуйте ещё раз." }, { status: 503 });
    }
  }

  // A provider named in the request body is honoured only for the founder;
  // for everyone else the choice is made here and the name never comes back.
  const showProviders = canSeeProviderNames(auth.email);
  const { provider, attribution } = staffAssistantView(
    showProviders,
    (body as { provider?: unknown })?.provider
  );

  let system = await buildStaffSystemPrompt(assistantRole);
  if (isAssistantDelegate(auth.email)) system += "\nThis account is an owner-authorized assistant delegate, not Anna or Karen. Use neutral address without calling the person Anna, Karen or founder. The assistant command permissions are the founder assistant's; this does not grant platform administrator authority.";
  const rawLocale = (body as { locale?: unknown })?.locale;
  const responseLocale = rawLocale === "en" || rawLocale === "ru" ? rawLocale : locale;
  system += responseLocale === "en"
    ? "\n\nActive interface language: English. Reply in English."
    : "\n\nАктивный язык интерфейса: русский. Отвечай по-русски.";
  if (assistantRole === "founder") {
    const archive = await searchKnowledgeArchive(messages[messages.length - 1].content);
    system += archive.context;
    if (archive.unavailable) system += "\nArchive search is temporarily unavailable. Tell Anna in the active language; do not claim to have searched or remembered unavailable notes.";
    else if (!archive.matches) system += "\nArchive keyword search found no matching notes. Do not invent saved notes or claim the archive has no such information.";
  }

  if (attachments) {
    system = `${system}\n\n${ATTACHMENT_READING_ACCURACY_RULE}`;
  }

  // Optional case binding: the assistant on a case page receives a live
  // snapshot of that case from the database (metadata, questionnaire,
  // documents list, payments, history).


  if (typeof rawCaseId === "string" && isUuid(rawCaseId)) {
    const caseContext = await buildCaseContext(rawCaseId);

    if (caseContext) {
      system = `${system}\n\n${caseContext}`;
    } else {
      system += "\nCase snapshot unavailable. Do not infer missing documents, payments or case decisions.";
    }
  } else {
    system += "\nNo Case snapshot is attached to this request. No live platform analytics are connected.";
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
  if (result.refusal) result.reply = providerPolicyRefusal((body as { locale?: unknown })?.locale === "en" ? "en" : "ru").reply;

  const reply = guardFactualReply({
    reply: result.reply,
    question: messages[messages.length - 1]?.content ?? "",
    locale: responseLocale,
    audience: assistantRole
  });
  return respondWithReply(reply);
}
