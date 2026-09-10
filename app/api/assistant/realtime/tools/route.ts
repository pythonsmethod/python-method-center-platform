import { NextResponse } from "next/server";
import { readVoiceBody, resolveVoiceActor, verifyVoiceReceipt, voiceConfig, voiceFailure, VoiceFailure, VOICE_DATA_ACCESS_VERSION } from "@/lib/assistant/realtime-server";
import { runVoiceSiteTool } from "@/lib/assistant/voice-site-tools";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/lib/i18n/locale";
import { runVoiceWebSearch } from "@/lib/assistant/voice-web-search";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let locale: Locale = "ru";
  try {
    const body = await readVoiceBody(request); locale = body.locale === "en" ? "en" : "ru";
    const actor = await resolveVoiceActor(request, body.scope, body.caseId);
    const receipt = verifyVoiceReceipt(body.receipt, actor, locale);
    if (actor.scope === "client" || receipt.dataAccessVersion !== VOICE_DATA_ACCESS_VERSION) throw new VoiceFailure("forbidden", 403);
    voiceConfig(actor); // Revoked pilot access and the kill switch take effect on every read.
    const db = createSupabaseServiceClient();
    if (!db) throw new VoiceFailure("unavailable", 503);
    const result = await db.rpc("bump_assistant_usage", { p_bucket_key: `voice:tools:${receipt.id}`, p_limit: 60 });
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (result.error || typeof row?.allowed !== "boolean") throw new VoiceFailure("unavailable", 503);
    if (!row.allowed) throw new VoiceFailure("limit", 429);
    const output = body.name === "search_web"
      ? await runVoiceWebSearch(actor, body.arguments, receipt, request.signal)
      : await runVoiceSiteTool(actor, body.name, body.arguments, receipt.timeZone ?? "UTC", new Date(), locale);
    return NextResponse.json({ output }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return voiceFailure(error, locale); }
}
