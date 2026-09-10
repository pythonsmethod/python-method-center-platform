import type { VoiceTranscript } from "./realtime-turns";
import type { WebResult } from "./web-results";
export type VoiceChatMessage = {
  role: "user" | "assistant"; content: string; source?: "text" | "voice_transcript";
  voiceKey?: string; voiceLive?: boolean; voice_state?: "completed" | "interrupted";
  web_results?: WebResult[];
  id?: string; created_at?: string; message_sequence?: number;
};
export function mergeVoiceTranscript(messages: VoiceChatMessage[], text: VoiceTranscript, sessionId: string): VoiceChatMessage[] {
  const result = [...messages];
  for (const role of ["user", "assistant"] as const) {
    const content = role === "user" ? text.user : text.assistant;
    if (!content && !(role === "assistant" && text.webResults?.length)) continue;
    const voiceKey = `${sessionId}:${text.turnId}:${role}`;
    const message: VoiceChatMessage = { role, content, voiceKey, voiceLive: text.live === true, voice_state: text.continuous ? undefined : text.state ?? "completed", source: "voice_transcript" };
    if (role === "assistant" && text.webResults?.length) message.web_results = text.webResults;
    const index = result.findIndex(row => row.voiceKey === voiceKey);
    if (index < 0) {
      const userIndex = role === "assistant" ? result.findIndex(row => row.voiceKey === `${sessionId}:${text.turnId}:user`) : -1;
      if (userIndex >= 0) result.splice(userIndex + 1, 0, message); else result.push(message);
    } else result[index] = message;
  }
  return result;
}
