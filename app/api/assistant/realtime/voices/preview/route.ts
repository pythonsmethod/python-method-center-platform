import { readVoiceBody, resolveVoiceActor, voiceConfig, voiceFailure, VoiceFailure } from "@/lib/assistant/realtime-server";
import { resolveOutputVoice } from "@/lib/assistant/voice-options-server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/lib/i18n/locale";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  let locale: Locale = "ru";
  try {
    const body = await readVoiceBody(request); locale = body.locale === "en" ? "en" : "ru";
    const actor = await resolveVoiceActor(request, body.scope, body.caseId);
    const config = voiceConfig(actor);
    const voice = resolveOutputVoice(actor, body.voice);
    const db = createSupabaseServiceClient();
    if (!db) throw new VoiceFailure("unavailable", 503);
    for (const [key, limit] of [[`voice:preview:minute:${Math.floor(Date.now() / 60000)}:${actor.profileId}`, 5], [`voice:preview:day:${actor.profileId}`, 20]] as const) {
      const { data, error } = await db.rpc("bump_assistant_usage", { p_bucket_key: key, p_limit: limit });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || typeof row?.allowed !== "boolean") throw new VoiceFailure("unavailable", 503);
      if (!row.allowed) throw new VoiceFailure("limit", 429);
    }
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST", headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20000)]),
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, response_format: "mp3", input: locale === "ru" ? "Здравствуйте! Я Анхам, ваш ИИ-помощник. Так звучит мой голос." : "Hello! I am Anham, your AI assistant. This is what my voice sounds like." }),
    });
    if (!response.ok || !response.body) throw new VoiceFailure("unavailable", 503);
    return new Response(response.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return voiceFailure(error, locale); }
}
