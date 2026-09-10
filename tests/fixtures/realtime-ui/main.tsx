// Standalone browser fixture, never an application route. No real audio,
// database, authentication credentials or external provider is used.
import { builtinVoiceOptions } from "@/lib/assistant/voice-options";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { RealtimeVoice } from "@/components/assistant/RealtimeVoice";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { mergeVoiceTranscript, type VoiceChatMessage } from "@/lib/assistant/voice-chat";
import type { Locale } from "@/lib/i18n/locale";
import "@/app/globals.css";

let lastVoice = "", previews = 0;
let deny = false, failSave = false, stopped = 0, callCount = 0, saved = 0, reads = 0, responseNumber = 0;
let reply = "", fixtureLocale: Locale = "ru";
const webSearch = new URLSearchParams(location.search).has("web");
const stored: Record<string, unknown[]> = {};
const searchResult = () => ({ text: fixtureLocale === "ru" ? "Тестовая новость NASA [1]" : "Synthetic NASA news [1]", citations: [{ title: "NASA", url: "https://www.nasa.gov/", start: fixtureLocale === "ru" ? 22 : 20, end: fixtureLocale === "ru" ? 25 : 23 }], searchedAt: "2026-09-09T12:00:00Z" });
const broadData = new URLSearchParams(location.search).has("broad");
const media = { getTracks: () => [{ stop: () => { stopped++; }, onended: null }] };
let channel: { readyState: string; onopen?: () => void; onmessage?: (e: { data: string }) => void; send: (s: string) => void; close: () => void };
function emit(event: object) { channel?.onmessage?.({ data: JSON.stringify(event) }); }
class Peer {
  ontrack = null;
  connectionState = "connected";
  addTrack() {}
  createDataChannel() {
    responseNumber = 0;
    channel = { readyState: "open", close() {}, send(s: string) {
      const event = JSON.parse(s);
      if (event.type === "conversation.item.create") {
        const data = JSON.parse(event.item.output);
        reply = webSearch ? (fixtureLocale === "ru" ? "Нашёл тестовую новость NASA. Источник — рядом с ответом." : "I found a synthetic NASA news item. The source is beside the reply.") : broadData
          ? (fixtureLocale === "ru" ? `В сохранённой анкете: ${data.rows[0].complaints}` : `The saved questionnaire says: ${data.rows[0].complaints}`)
          : (fixtureLocale === "ru" ? `Всего зарегистрировано ${data.registeredClientAccounts} клиентов, сегодня — ${data.registeredToday}.` : `${data.registeredClientAccounts} clients are registered, ${data.registeredToday} today.`);
      }
      if (event.type === "response.create") {
        responseNumber++;
        emit({ type: "response.created", response: { id: `r${responseNumber}`, metadata: event.response.metadata } });
        if (responseNumber > 1) emit({ type: "response.output_audio_transcript.delta", response_id: `r${responseNumber}`, delta: reply });
      }
    } };
    return channel;
  }
  async createOffer() { return { sdp: "v=0\r\nfixture" }; }
  async setLocalDescription() {}
  async setRemoteDescription() { channel.onopen?.(); }
  close() {}
}
Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: async () => { if (deny) throw new DOMException("", "NotAllowedError"); return media; } } });
Object.defineProperty(window, "RTCPeerConnection", { configurable: true, value: Peer });
window.fetch = async (url, options) => {
  const address = new URL(String(url), window.location.origin);
  if (address.pathname.endsWith("/voices")) return Response.json({ voices: builtinVoiceOptions, defaultVoice: "marin", preferenceKey: "anham-voice-v1:synthetic" });
  if (address.pathname.endsWith("/history")) return Response.json({ messages: Object.values(stored).flat(), hasMore: false });
  if (address.pathname.endsWith("/preview")) {
    previews++;
    const bytes = new Uint8Array(32044), view = new DataView(bytes.buffer);
    const word = (at: number, text: string) => bytes.set(new TextEncoder().encode(text), at);
    word(0, "RIFF"); view.setUint32(4, 32036, true); word(8, "WAVEfmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); word(36, "data"); view.setUint32(40, 32000, true);
    return new Response(bytes, { headers: { "Content-Type": "audio/wav" } });
  }
  if (address.pathname.endsWith("/transcript") && options?.method !== "POST") {
    const en = address.searchParams.get("locale") === "en";
    const older = address.searchParams.has("before");
    if (webSearch) return Response.json({ messages: stored[en ? "en" : "ru"] || [], nextBefore: null });
    return new Response(JSON.stringify({ messages: [{ role: "user", content: older ? (en ? "Earlier saved question" : "Ранее сохранённый вопрос") : (en ? "Recently saved question" : "Недавно сохранённый вопрос"), source: "voice_transcript", voice_state: "interrupted" }], nextBefore: older ? null : 100 }));
  }
  if (String(url).endsWith("/session")) { callCount++; lastVoice = JSON.parse(String(options?.body)).voice; return new Response(JSON.stringify({ sdp: "v=0\r\nfixture", receipt: "fixture", maxSeconds: 300 })); }
  if (String(url).endsWith("/transcript")) { if (failSave) return new Response("{}", { status: 503 }); saved++; if (webSearch) { const body = JSON.parse(String(options?.body)); (stored[body.locale] ??= []).push({ role: "user", content: body.user, source: "voice_transcript" }, { role: "assistant", content: body.assistant, source: "voice_transcript", web_results: [searchResult()] }); } return new Response(JSON.stringify({ saved: true })); }
  if (String(url).endsWith("/tools")) {
    reads++;
    if (webSearch) return Response.json({ output: { webResult: searchResult(), webReceipt: "synthetic-signature" } });
    if (broadData) {
      const call = JSON.parse(String(options?.body));
      if (call.name !== "query_site_records" || call.arguments.dataset !== "questionnaires") throw new Error("Unexpected fixture tool");
      return new Response(JSON.stringify({ output: { source: "health_questionnaire_versions", totalMatches: 1, rows: [{ id: "synthetic", complaints: fixtureLocale === "ru" ? "Тестовый запрос на консультацию." : "Synthetic request for a consultation." }] } }));
    }
    return new Response(JSON.stringify({ output: { registeredClientAccounts: 12, registeredToday: 2 } }));
  }
  throw new Error("External request blocked by fixture");
};
function Fixture() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [active, setActive] = useState(false);
  const [lines, setLines] = useState<VoiceChatMessage[]>([]);
  return <main style={{ maxWidth: 600, padding: 24, margin: "40px auto" }}>
    <h1>{locale === "ru" ? "Разговор с Анхамом" : "Talk to Anham"}</h1>
    <p>Isolated synthetic UI test — no external calls</p>
    <nav><button onClick={() => { setLocale("ru"); fixtureLocale = "ru"; setLines([]); document.documentElement.lang = "ru"; }}>RU</button> <button onClick={() => { setLocale("en"); fixtureLocale = "en"; setLines([]); document.documentElement.lang = "en"; }}>EN</button></nav>
    {new URLSearchParams(location.search).has("chat")
      ? <AssistantChat key={locale} endpoint="/api/assistant/staff" attachments locale={locale} intro={locale === "ru" ? "Чем помочь?" : "How can I help?"} />
      : <RealtimeVoice key={locale} locale={locale} scope="staff" onActive={setActive} onTranscript={(text, session) => setLines(current => mergeVoiceTranscript(current, text, session))} />}
    <p data-testid="active">{String(active)}</p>
    <div>{lines.map((line, index) => <p key={index} data-live={line.voiceLive} data-state={line.voice_state}>{line.content} {line.voice_state === "interrupted" ? (locale === "ru" ? "(Прервано)" : "(Interrupted)") : ""}</p>)}</div>
    <hr /><p>Synthetic event controls:</p>
    <button onClick={() => { deny = !deny; }}>Toggle permission denial</button>
    <button onClick={() => { failSave = !failSave; }}>Toggle save failure</button>
    <button onClick={() => { emit({ type: "input_audio_buffer.committed", item_id: "u1" }); emit({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: webSearch ? (locale === "ru" ? "Анхам, найди новости NASA в интернете." : "Anham, search the web for NASA news.") : broadData ? (locale === "ru" ? "Анхам, что указано в анкете тестового клиента?" : "Anham, what does the test client's questionnaire say?") : (locale === "ru" ? "Анхам, сколько всего регистраций?" : "Anham, how many registrations?") }); }}>Simulate speaking</button>
    <button onClick={() => { emit({ type: "response.done", response: { id: `r${responseNumber}`, status: "completed", output: [{ type: "function_call", id: "f1", call_id: "call1", name: webSearch ? "search_web" : broadData ? "query_site_records" : "registration_counts", arguments: webSearch ? JSON.stringify({ query: "NASA news" }) : broadData ? JSON.stringify({ dataset: "questionnaires", fields: ["complaints"], filters: [{ field: "profile_id", op: "eq", value: "00000000-0000-4000-8000-000000000001" }] }) : "{}" }] } }); }}>Read site data</button>
    <button onClick={() => { emit({ type: "response.done", response: { id: `r${responseNumber}`, status: "completed", output: [{ id: "a1", content: [{ type: "audio", transcript: reply || "Hello, how can I help?" }] }] } }); emit({ type: "output_audio_buffer.stopped", response_id: `r${responseNumber}` }); }}>Complete reply</button>
    <button onClick={() => { document.getElementById("counts")!.textContent = JSON.stringify({ stopped, callCount, saved, reads, lastVoice, previews }); }}>Show counts</button><pre id="counts" />
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
