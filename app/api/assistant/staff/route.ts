import { NextResponse } from "next/server";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { askClaude, hasClaudeEnv, sanitizeChatMessages } from "@/lib/assistant/claude";
import { askAssistantTeam, askKarenAssistant } from "@/lib/assistant/router";
import { staffAssistantView } from "@/lib/assistant/staff-provider";
import { buildCaseContext } from "@/lib/assistant/case-context";
import { buildStaffSystemPrompt } from "@/lib/assistant/prompts";
import { canSeeProviderNames } from "@/lib/auth/require-founder";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { isKarenAssistantEmail } from "@/lib/auth/require-karen";
import { isUuid } from "@/lib/utils/uuid";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  if (!isKarenAssistantEmail(auth.email)) {
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

  const attachments = sanitizeAttachments(
    (body as { attachments?: unknown })?.attachments
  );

  if (attachments === "invalid") {
    return NextResponse.json(
      {
        error:
          "Не удалось прочитать вложение. Поддерживаются фото, PDF и текстовые файлы. Если файлов очень много, попробуйте отправить их двумя частями."
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
  // Attachments go to the one provider that reads photos and PDFs directly.
  // The arbiter path is skipped for such a question rather than answering it
  // without seeing the file.
  const result = attachments
    ? hasClaudeEnv()
      ? await askClaude(system, messages, 1500, attachments)
      : ({
          status: "error" as const,
          message: showProviders
            ? "Файлы и фото читает Claude — добавьте ANTHROPIC_API_KEY в переменные окружения."
            : "Помощник сейчас не может читать файлы. Напишите основателю — это настройка платформы."
        })
    : showProviders && provider !== "best"
      ? await askAssistantTeam(
          system,
          messages,
          provider === "both" ? 1600 : 2200,
          provider,
          { attribution, deepReasoning: true }
        )
      : await askKarenAssistant(system, messages, 2200);

  if (result.status === "unavailable") {
    return NextResponse.json(
      {
        error: showProviders
          ? "ИИ-помощник ещё не подключён: добавьте ANTHROPIC_API_KEY (Claude) и/или OPENAI_API_KEY (GPT) в переменные окружения."
          : "ИИ-помощник ещё не подключён. Напишите основателю — это настройка платформы."
      },
      { status: 503 }
    );
  }

  if (result.status === "error") {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ reply: result.reply });
}
