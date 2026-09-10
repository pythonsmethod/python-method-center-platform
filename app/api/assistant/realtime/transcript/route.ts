import { NextResponse } from "next/server";
import { checkVoiceOrigin, readVoiceBody, resolveVoiceActor, verifyVoiceReceipt, voiceFailure, VoiceFailure } from "@/lib/assistant/realtime-server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/lib/i18n/locale";
import { verifyWebResults } from "@/lib/assistant/voice-web-search";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let locale: Locale = request.headers.get("accept-language")?.startsWith("en") ? "en" : "ru";
  try {
    const body = await readVoiceBody(request);
    locale = body.locale === "en" ? "en" : "ru";
    const actor = await resolveVoiceActor(request, body.scope, body.caseId);
    const receipt = verifyVoiceReceipt(body.receipt, actor, locale);
    const webResults = verifyWebResults(body.webReceipts, receipt);
    if (typeof body.turnId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(body.turnId)) throw new VoiceFailure("invalid", 400);
    if (body.state !== undefined && body.state !== "interrupted") throw new VoiceFailure("invalid", 400);
    if (typeof body.user !== "string" || !body.user.trim() || body.user.length > 12_000 || typeof body.assistant !== "string" || body.assistant.length > 12_000 || (!body.assistant.trim() && body.state !== "interrupted")) throw new VoiceFailure("invalid", 400);
    const db = createSupabaseServiceClient();
    if (!db) throw new VoiceFailure("unavailable", 503);
    const { error } = await db.from("assistant_messages").upsert([
      { role: "user", content: (body.user as string).trim() },
      ...(body.assistant.trim() || webResults.length ? [{ role: "assistant", content: body.assistant.trim(), ...(webResults.length ? { web_results: webResults } : {}) }] : []),
    ].map(row => ({ ...row, profile_id: actor.profileId, case_id: actor.caseId, tier: actor.tier, locale, conversation_scope: actor.scope, exchange_id: `${receipt.id}:${body.turnId}`, source: "voice_transcript", voice_state: body.state ?? "completed" })), { onConflict: "profile_id,exchange_id,role", ignoreDuplicates: true });
    if (error) throw new VoiceFailure("unavailable", 503);
    return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return voiceFailure(error, locale); }
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const locale = query.get("locale") === "en" ? "en" : "ru";
  try {
    checkVoiceOrigin(request);
    const actor = await resolveVoiceActor(request, query.get("scope"), query.get("caseId"));
    const before = query.get("before");
    if (before !== null && (!/^[1-9][0-9]{0,15}$/.test(before) || !Number.isSafeInteger(Number(before)))) throw new VoiceFailure("invalid", 400);
    const db = createSupabaseServiceClient();
    if (!db) throw new VoiceFailure("unavailable", 503);
    let rows = db.from("assistant_messages").select("role, content, source, voice_state, web_results, message_sequence").eq("profile_id", actor.profileId).eq("conversation_scope", actor.scope).eq("locale", locale);
    if (actor.scope !== "client") rows = actor.caseId ? rows.eq("case_id", actor.caseId) : rows.is("case_id", null);
    if (before) rows = rows.lt("message_sequence", Number(before));
    const { data, error } = await rows.order("message_sequence", { ascending: false }).limit(61);
    if (error) throw new VoiceFailure("unavailable", 503);
    const page = (data ?? []).slice(0, 60);
    return NextResponse.json({ messages: page.reverse(), nextBefore: (data?.length ?? 0) > 60 ? page[0].message_sequence : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return voiceFailure(error, locale); }
}
