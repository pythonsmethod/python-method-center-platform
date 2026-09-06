import { NextResponse } from "next/server";
import { getOwnAssistantHistory } from "@/lib/assistant/history";
import { buildPaidClientSystemPrompt, buildRegisteredSystemPrompt } from "@/lib/assistant/prompts";
import { resolveAssistantAudience } from "@/lib/assistant/tiers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const audience = await resolveAssistantAudience(accessToken);

  if (!accessToken || !audience.profileId || audience.tier === "guest") {
    return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Голосовой Anham ещё не подключён." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as { locale?: unknown };
  const locale = body.locale === "en" ? "en" : "ru";
  const basePrompt = audience.tier === "client"
    ? await buildPaidClientSystemPrompt(audience.context)
    : await buildRegisteredSystemPrompt(audience.context);
  const history = await getOwnAssistantHistory(audience.profileId, locale, 24);
  const remembered = history.status === "ready"
    ? history.messages.map((message) => `${message.role === "user" ? "Человек" : "Anham"}: ${message.content}`).join("\n")
    : "История временно недоступна.";
  const instructions = `${basePrompt}\n\nЭто живой голосовой разговор. Говори естественно, тепло и кратко, не перебивай. Не ставь диагнозы и не назначай лечение. Вопросы о состоянии, анализах и изменении плана передавай Professor Python. Язык интерфейса: ${locale === "en" ? "English" : "русский"}.\n\nПоследняя сохранённая переписка:\n${remembered}`;

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 120 },
      session: {
        type: "realtime",
        model: "gpt-realtime",
        output_modalities: ["audio"],
        instructions,
        max_output_tokens: 900,
        audio: {
          input: {
            transcription: { model: "gpt-4o-transcribe", language: locale },
            turn_detection: { type: "semantic_vad", eagerness: "medium", create_response: true, interrupt_response: true }
          },
          output: { voice: "marin", speed: 1 }
        }
      }
    })
  });

  const result = await response.json().catch(() => null) as { value?: string; expires_at?: number; error?: { message?: string } } | null;
  if (!response.ok || !result?.value) {
    return NextResponse.json({ error: result?.error?.message || "Не удалось начать голосовой разговор." }, { status: 502 });
  }

  return NextResponse.json({ clientSecret: result.value, expiresAt: result.expires_at });
}
