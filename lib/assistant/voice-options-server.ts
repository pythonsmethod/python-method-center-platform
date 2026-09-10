import { createHash } from "node:crypto";
import { builtinVoiceOptions, customVoiceName, isBuiltinVoice } from "./voice-options";
import { VoiceFailure, type VoiceActor } from "./realtime-server";
import type { Locale } from "@/lib/i18n/locale";

// Provider IDs never come from a browser and never change the assistant persona.
function personalVoice(id: "founder" | "karen") {
  const prefix = `ANHAM_${id.toUpperCase()}_VOICE`;
  const voice = process.env[`${prefix}_ID`]?.trim();
  const consent = process.env[`${prefix}_CONSENT_ID`]?.trim();
  return process.env.ANHAM_CUSTOM_VOICES_ENABLED === "true" && /^voice_[a-zA-Z0-9_-]{1,150}$/.test(voice ?? "") && /^cons_[a-zA-Z0-9_-]{1,150}$/.test(consent ?? "") ? voice! : null;
}
export function availableVoices(actor: VoiceActor, locale: Locale) {
  const defaultVoice = process.env.OPENAI_REALTIME_VOICE?.trim() || "marin";
  return {
    defaultVoice: isBuiltinVoice(defaultVoice) ? defaultVoice : "marin",
    preferenceKey: `anham-voice-v1:${createHash("sha256").update(`${actor.profileId}:${actor.scope}`).digest("hex").slice(0, 24)}`,
    voices: [...builtinVoiceOptions, ...(actor.scope === "client" ? [] : (["founder", "karen"] as const).map(id => ({ id, name: customVoiceName(id, locale), custom: true, available: !!personalVoice(id) })))],
  };
}
export function resolveOutputVoice(actor: VoiceActor, selected: unknown): string | { id: string } {
  if (selected === undefined) return availableVoices(actor, "en").defaultVoice;
  if (isBuiltinVoice(selected)) return selected;
  if (selected === "founder" || selected === "karen") {
    if (actor.scope === "client") throw new VoiceFailure("forbidden", 403);
    const id = personalVoice(selected);
    if (!id) throw new VoiceFailure("unavailable", 503);
    return { id };
  }
  throw new VoiceFailure("invalid", 400);
}
