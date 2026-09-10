import { NextResponse } from "next/server";
import { readVoiceBody, resolveVoiceActor, verifyVoiceReceipt, voiceConfig, voiceFailure, VoiceFailure } from "@/lib/assistant/realtime-server";
import { safeVoiceDiagnosticCode } from "@/lib/assistant/voice-diagnostics";
import { isBuiltinVoice } from "@/lib/assistant/voice-options";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/lib/i18n/locale";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let locale: Locale = "ru";
  try {
    const body = await readVoiceBody(request); locale = body.locale === "en" ? "en" : "ru";
    const actor = await resolveVoiceActor(request, body.scope, body.caseId);
    const receipt = verifyVoiceReceipt(body.receipt, actor, locale);
    voiceConfig(actor);
    const db = createSupabaseServiceClient();
    if (!db) throw new VoiceFailure("unavailable", 503);
    const result = await db.rpc("bump_assistant_usage", { p_bucket_key: `voice:diagnostic:${receipt.id}`, p_limit: 2 });
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (result.error || typeof row?.allowed !== "boolean") throw new VoiceFailure("unavailable", 503);
    if (!row.allowed) throw new VoiceFailure("limit", 429);
    // Only enumerated metadata; no profile, receipt, message, audio or arguments.
    console.warn("anham_voice_failure", {
      code: safeVoiceDiagnosticCode(body.code),
      voice: isBuiltinVoice(body.voice) ? body.voice : "unspecified",
      locale,
    });
    return NextResponse.json({ recorded: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return voiceFailure(error, locale); }
}
