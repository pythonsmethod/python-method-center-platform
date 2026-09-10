import { withAiSafety } from "./ai-policy";
import WebSocket from "ws";

export function attachLiveSession(id: string, apiKey: string) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw new Error("AI_SESSION_DENIED");
  return new WebSocket(`wss://api.openai.com/v1/live/sessions/${id}/attach`, {
    headers: { Authorization: `Bearer ${apiKey}` }, handshakeTimeout: 10_000, maxPayload: 1_000_000,
  });
}

// All generative HTTP traffic passes here. Unknown protocols/endpoints fail closed.
// This does not grant permission to call a tool or access a record.
export async function aiFetch(destination: string, init: RequestInit): Promise<Response> {
  const url = new URL(destination);
  if (url.origin !== "https://api.openai.com" || url.username || url.password || url.search || url.hash || init.method !== "POST") {
    throw new Error("AI_DESTINATION_DENIED");
  }
  let body: BodyInit;
  if (url.pathname === "/v1/realtime/calls") {
    if (!(init.body instanceof FormData)) throw new Error("AI_BODY_DENIED");
    const raw = init.body.get("session");
    if (typeof raw !== "string") throw new Error("AI_BODY_DENIED");
    const session = JSON.parse(raw);
    if (!session || typeof session.instructions !== "string") throw new Error("AI_BODY_DENIED");
    const form = new FormData();
    for (const [key, value] of init.body.entries()) form.append(key, value);
    form.set("session", JSON.stringify({ ...session, instructions: withAiSafety(session.instructions) }));
    body = form;
  } else {
    if (typeof init.body !== "string") throw new Error("AI_BODY_DENIED");
    const payload = JSON.parse(init.body);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("AI_BODY_DENIED");
    if (url.pathname === "/v1/live/sessions") {
      if (payload.session?.model !== "gpt-live-1" || typeof payload.session.instructions !== "string" || payload.transport?.type !== "webrtc") throw new Error("AI_BODY_DENIED");
      payload.session.instructions = withAiSafety(payload.session.instructions);
      payload.session.store = false;
      payload.session.delegation = { type: "client" };
      payload.session.client = { data_channel: {
        allowed_client_events: ["session.close", "session.input_audio.mute", "session.input_audio.unmute"],
        allowed_server_events: [],
      } };
    } else if (/^\/v1\/live\/sessions\/[a-zA-Z0-9_-]{1,160}\/hangup$/.test(url.pathname)) {
      if (Object.keys(payload).length) throw new Error("AI_BODY_DENIED");
    } else if (url.pathname === "/v1/chat/completions") {
      if (!Array.isArray(payload.messages)) throw new Error("AI_BODY_DENIED");
      const instructions = payload.messages.filter((m: {role?: string}) => m.role === "system");
      if (instructions.some((m: {content?: unknown}) => typeof m.content !== "string")) throw new Error("AI_BODY_DENIED");
      payload.messages = [{ role: "system", content: withAiSafety(instructions.map((m: {content: string}) => m.content).join("\n")) },
        ...payload.messages.filter((m: {role?: string}) => m.role !== "system")];
    } else if (url.pathname === "/v1/responses") {
      if (payload.instructions !== undefined && typeof payload.instructions !== "string") throw new Error("AI_BODY_DENIED");
      payload.instructions = withAiSafety(payload.instructions ?? "");
      payload.store = false;
    } else if (url.pathname === "/v1/audio/speech") {
      // This endpoint is only a fixed, server-authored voice sample, not free-form TTS.
      if (![
        "Здравствуйте! Я Анхам, ваш ИИ-помощник. Так звучит мой голос.",
        "Hello! I am Anham, your AI assistant. This is what my voice sounds like."
      ].includes(payload.input)) throw new Error("AI_SPEECH_INPUT_DENIED");
    } else throw new Error("AI_ENDPOINT_DENIED");
    body = JSON.stringify(payload);
  }
  return fetch(url.href, { ...init, body, redirect: "error", signal: AbortSignal.any([
    AbortSignal.timeout(60_000), ...(init.signal ? [init.signal] : [])
  ]) });
}
