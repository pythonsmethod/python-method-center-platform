import type { VoiceActor } from "./realtime-server";
import { VoiceFailure } from "./realtime-server";
import { isBuiltinVoice } from "./voice-options";

export const LIVE_MODEL = "gpt-live-1";
// https://developers.openai.com/api/docs/models/gpt-live-1, checked 2026-09-10.
export const LIVE_USD_PER_SECOND = 0.05 / 60;
export function isLivePilot(email: string | null) {
  return process.env.GPT_LIVE_ENABLED === "true" && !!email && (process.env.GPT_LIVE_PILOT_EMAILS ?? "").split(",").some(item => item.trim().toLowerCase() === email.toLowerCase());
}
export function liveConfig(actor: VoiceActor) {
  const emails = (process.env.GPT_LIVE_PILOT_EMAILS ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const apiKey = process.env.GPT_LIVE_OPENAI_API_KEY?.trim();
  const maxSeconds = Number(process.env.GPT_LIVE_MAX_SECONDS ?? 240);
  const dailyLimit = Number(process.env.GPT_LIVE_DAILY_SESSIONS ?? 6);
  const model = process.env.GPT_LIVE_MODEL?.trim() || LIVE_MODEL;
  if (process.env.GPT_LIVE_ENABLED !== "true" || !actor.email || !emails.includes(actor.email.toLowerCase()) || !apiKey ||
      model !== LIVE_MODEL || !Number.isInteger(maxSeconds) || maxSeconds < 30 || maxSeconds > 240 ||
      !Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 20) throw new VoiceFailure("unavailable", 503);
  const voice = process.env.GPT_LIVE_VOICE?.trim() || "marin";
  if (!isBuiltinVoice(voice)) throw new VoiceFailure("unavailable", 503);
  return { apiKey, model, maxSeconds, dailyLimit, voice };
}
