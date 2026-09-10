import { ANHAM_VOICE_SPEED, voiceDeliveryInstructions } from "@/lib/assistant/voice-delivery";
import { NextResponse } from "next/server";
import { issueVoiceReceipt, readVoiceBody, reserveVoiceSession, resolveVoiceActor, voiceConfig, voiceFailure, VoiceFailure, voiceInstructions } from "@/lib/assistant/realtime-server";
import type { Locale } from "@/lib/i18n/locale";
import { validatedTimeZone, voiceSiteTools } from "@/lib/assistant/voice-site-tools";
import { resolveOutputVoice } from "@/lib/assistant/voice-options-server";
import { getOwnAssistantHistory } from "@/lib/assistant/history";
import { withFactualHonesty } from "@/lib/assistant/factual-honesty";
import { assistantSource, renderSourceContext } from "@/lib/assistant/source-context";
import { clientVoiceInstructions } from "@/lib/assistant/client-voice-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let locale: Locale = request.headers.get("accept-language")?.startsWith("en") ? "en" : "ru";
  try {
    const body = await readVoiceBody(request);
    locale = body.locale === "en" ? "en" : "ru";
    if (body.consent !== true || typeof body.sdp !== "string" || !body.sdp.startsWith("v=0") || body.sdp.length > 30_000) throw new VoiceFailure("invalid", 400);
    const actor = await resolveVoiceActor(request, body.scope, body.caseId);
    const config = voiceConfig(actor);
    const selectedVoice = resolveOutputVoice(actor, body.voice);
    const timeZone = validatedTimeZone(body.timeZone);
    await reserveVoiceSession(actor, config.dailyLimit);
    const history = await getOwnAssistantHistory(actor.profileId, locale, 24, { private: actor.scope !== "client", caseId: actor.caseId });
    const remembered = history.status === "ready"
      ? renderSourceContext(history.messages.map((message, index) => assistantSource({
          id: `history_${index}`, kind: message.role === "user" ? "user_report" : "ai_draft",
          origin: "assistant_messages", availability: "available", retrievedAt: new Date().toISOString(),
          recordedAt: message.created_at, freshness: "historical",
          scope: message.role === "assistant" && message.voice_state === "interrupted"
            ? "interrupted AI draft; may include words not heard by the user; not a completed reply or confirmed action"
            : "saved conversation only; not proof of facts or actions", data: message.content
        })))
      : renderSourceContext([assistantSource({ id: "history", kind: "ai_draft", origin: "assistant_messages", availability: "unavailable", retrievedAt: new Date().toISOString(), scope: "saved conversation", data: null })]);
    const form = new FormData();
    form.set("sdp", body.sdp);
    form.set("session", JSON.stringify({
      type: "realtime", model: config.model, output_modalities: ["audio"],
      instructions: withFactualHonesty(`${actor.scope === "client" ? await clientVoiceInstructions(request, actor, locale) : voiceInstructions(actor, locale)}\n${remembered}\n${voiceDeliveryInstructions(locale)}`), max_output_tokens: 900,
      audio: {
        input: { transcription: { model: config.transcriptionModel, language: locale }, turn_detection: { type: "semantic_vad", eagerness: "low", create_response: false, interrupt_response: true } },
        output: { voice: selectedVoice, speed: ANHAM_VOICE_SPEED },
      }, tools: voiceSiteTools(actor.scope, actor),
    }));
    // Unified WebRTC handshake: no provider credential enters the browser.
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST", headers: { Authorization: `Bearer ${config.apiKey}` }, body: form, signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new VoiceFailure("connection", 502);
    const sdp = await response.text();
    if (!sdp.startsWith("v=0")) throw new VoiceFailure("connection", 502);
    return NextResponse.json({ sdp, receipt: issueVoiceReceipt(actor, locale, config.signingKey, config.maxSeconds, timeZone), maxSeconds: config.maxSeconds }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return voiceFailure(error, locale); }
}
