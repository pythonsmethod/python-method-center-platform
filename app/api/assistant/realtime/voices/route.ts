import { NextResponse } from "next/server";
import { liveConfig, isLivePilot } from "@/lib/assistant/live-config";
import { isBuiltinVoice } from "@/lib/assistant/voice-options";
import { availableVoices } from "@/lib/assistant/voice-options-server";
import { checkVoiceOrigin, resolveVoiceActor, voiceFailure } from "@/lib/assistant/realtime-server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const locale = query.get("locale") === "en" ? "en" : "ru";
  try {
    checkVoiceOrigin(request);
    const actor = await resolveVoiceActor(request, query.get("scope"), query.get("caseId"));
    const live = isLivePilot(actor.email);
    const selection = availableVoices(actor, locale);
    if (live) {
      selection.voices = selection.voices.filter(v => isBuiltinVoice(v.id));
      selection.defaultVoice = liveConfig(actor).voice;
    }
    return NextResponse.json({ ...selection, live }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return voiceFailure(error, locale); }
}
