import { readVoiceBody, resolveVoiceActor, reserveVoiceSession, voiceFailure, VoiceFailure } from "@/lib/assistant/realtime-server";
import { liveConfig } from "@/lib/assistant/live-config";
import { openLiveSession } from "@/lib/assistant/live-session";
import { validatedTimeZone } from "@/lib/assistant/voice-site-tools";
import { isBuiltinVoice } from "@/lib/assistant/voice-options";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  let locale: "ru" | "en" = request.headers.get("accept-language")?.startsWith("en") ? "en" : "ru";
  try {
    const body = await readVoiceBody(request); locale = body.locale === "en" ? "en" : "ru";
    if (body.consent !== true || typeof body.sdp !== "string" || !body.sdp.startsWith("v=0") || body.sdp.length > 30_000) throw new VoiceFailure("invalid", 400);
    const actor = await resolveVoiceActor(request, body.scope, body.caseId), config = liveConfig(actor);
    const voice = body.voice ?? config.voice;
    if (!isBuiltinVoice(voice)) throw new VoiceFailure("invalid", 400);
    await reserveVoiceSession(actor, config.dailyLimit);
    return await openLiveSession({ request, actor, locale, sdp: body.sdp, voice, timeZone: validatedTimeZone(body.timeZone) });
  } catch (error) { return voiceFailure(error, locale); }
}
