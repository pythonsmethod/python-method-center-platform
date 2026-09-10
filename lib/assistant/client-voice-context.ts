import { resolveAssistantAudience } from "./tiers";
import { buildPaidClientSystemPrompt, buildRegisteredSystemPrompt } from "./prompts";
import { VoiceFailure, type VoiceActor } from "./realtime-server";
import type { Locale } from "@/lib/i18n/locale";

export async function clientVoiceInstructions(request: Request, actor: VoiceActor, locale: Locale) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const audience = await resolveAssistantAudience(token);
  if (audience.profileId !== actor.profileId || audience.caseId !== actor.caseId || audience.tier === "guest") throw new VoiceFailure("forbidden", 403);
  const prompt = audience.tier === "client" ? await buildPaidClientSystemPrompt(audience.context) : await buildRegisteredSystemPrompt(audience.context);
  return `${prompt}\nThis is a live client voice conversation. Speak ${locale === "en" ? "English" : "Russian"}, naturally and concisely. Only the authenticated client's own source context and conversation history are supplied. There are no staff tools, other clients, internal knowledge-writing commands or admin access. Never diagnose, prescribe, change treatment or represent a draft as a Karen decision. Do not invent actions, unavailable sources or paid entitlements.`;
}
