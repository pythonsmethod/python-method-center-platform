import { NextResponse } from "next/server";
import { availableVoices } from "@/lib/assistant/voice-options-server";
import { checkVoiceOrigin, resolveVoiceActor, voiceFailure } from "@/lib/assistant/realtime-server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const locale = query.get("locale") === "en" ? "en" : "ru";
  try {
    checkVoiceOrigin(request);
    const actor = await resolveVoiceActor(request, query.get("scope"), query.get("caseId"));
    return NextResponse.json(availableVoices(actor, locale), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return voiceFailure(error, locale); }
}
