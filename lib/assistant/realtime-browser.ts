import { RealtimeTurns, type VoiceExchange, type VoiceTranscript, type VoiceToolCall } from "./realtime-turns";
import type { VoiceError, VoiceState } from "./realtime-contract";
import type { Locale } from "@/lib/i18n/locale";

type Options = { voice?: string; locale: Locale; scope: "client" | "staff"; caseId?: string; onState: (state: VoiceState) => void; onError: (error: VoiceError) => void; onIncomplete: () => void; onDuration: () => void; onExchange: (pair: VoiceExchange, receipt: string) => void; onTranscript?: (text: VoiceTranscript) => void };

export class RealtimeBrowser {
  private closed = false;
  private peer?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private stream?: MediaStream;
  private audio?: HTMLAudioElement;
  private abort = new AbortController();
  private timeout?: ReturnType<typeof setTimeout>;
  private duration?: ReturnType<typeof setTimeout>;
  private turns?: RealtimeTurns;
  private receipt = "";
  private previousAssistant = "";
  constructor(private options: Options) {}

  async start() {
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") return this.fail("unsupported");
    this.options.onState("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      // A permission prompt may resolve after Stop or unmount.
      if (this.closed) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.options.onState("connecting");
      this.timeout = setTimeout(() => this.fail("connection"), 30_000);
      this.peer = new RTCPeerConnection();
      this.audio = new Audio();
      this.audio.autoplay = true;
      for (const track of stream.getTracks()) {
        track.onended = () => { if (!this.closed) this.fail("microphone"); };
        this.peer.addTrack(track, stream);
      }
      this.peer.ontrack = event => {
        if (this.closed || !this.audio) return;
        this.audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void this.audio.play().catch(() => { if (!this.closed) this.fail("playback"); });
      };
      this.peer.onconnectionstatechange = () => {
        if (!this.closed && ["failed", "disconnected", "closed"].includes(this.peer?.connectionState ?? "")) this.fail("connection");
      };
      this.channel = this.peer.createDataChannel("oai-events");
      this.turns = new RealtimeTurns(event => {
        if (this.channel?.readyState === "open") this.channel.send(JSON.stringify(event));
      }, pair => { this.previousAssistant = pair.assistant; this.options.onExchange(pair, this.receipt); }, this.options.onIncomplete, { onTranscript: this.options.onTranscript, tool: (call, userTurn) => this.readSite(call, userTurn) });
      this.channel.onopen = () => {
        if (this.closed) return;
        clearTimeout(this.timeout);
        this.options.onState("listening");
      };
      this.channel.onclose = () => { if (!this.closed) this.fail("connection"); };
      this.channel.onerror = () => { if (!this.closed) this.fail("connection"); };
      this.channel.onmessage = message => {
        if (this.closed) return;
        try {
          const event = JSON.parse(message.data);
          if (event.type === "error") return this.fail("connection");
          this.turns?.receive(event);
          if (event.type === "input_audio_buffer.speech_started" || event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared" || event.type === "conversation.item.input_audio_transcription.failed") this.options.onState("listening");
          if (event.type === "input_audio_buffer.speech_stopped" || event.type === "response.created") this.options.onState("thinking");
          if (event.type === "output_audio_buffer.started") this.options.onState("speaking");
        } catch { this.fail("connection"); }
      };
      const offer = await this.peer.createOffer();
      if (this.closed) return;
      await this.peer.setLocalDescription(offer);
      if (this.closed) return;
      const response = await fetch("/api/assistant/realtime/session", {
        method: "POST", credentials: "same-origin", signal: this.abort.signal,
        headers: { "Content-Type": "application/json", "Accept-Language": this.options.locale },
        body: JSON.stringify({ sdp: offer.sdp, locale: this.options.locale, scope: this.options.scope, voice: this.options.voice, caseId: this.options.caseId, consent: true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const result = await response.json();
      if (this.closed) return;
      if (!response.ok) return this.fail(["unauthorized", "forbidden", "unavailable", "limit", "invalid"].includes(result.code) ? result.code : "connection");
      if (typeof result.sdp !== "string" || typeof result.receipt !== "string" || !Number.isInteger(result.maxSeconds) || result.maxSeconds < 1 || result.maxSeconds > 900) return this.fail("connection");
      this.receipt = result.receipt;
      await this.peer.setRemoteDescription({ type: "answer", sdp: result.sdp });
      if (this.closed) return;
      this.duration = setTimeout(() => { this.stop(); this.options.onDuration(); }, result.maxSeconds * 1000);
    } catch (error) {
      if (this.closed) return;
      const name = error instanceof Error ? error.name : "";
      this.fail(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "NotReadableError" ? "microphone" : "connection");
    }
  }
  private fail(error: VoiceError) { this.stop(); this.options.onError(error); this.options.onState("error"); }
  private async readSite(call: VoiceToolCall, userTurn: { id: string; text: string }) {
    if (this.closed || this.options.scope !== "staff") return { error: "forbidden" };
    this.options.onState(call.name === "search_web" ? "searching" : "reading");
    if (call.arguments.length > 2000) return { error: "invalid" };
    const response = await fetch("/api/assistant/realtime/tools", {
      method: "POST", credentials: "same-origin", signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(call.name === "ask_text_assistant" ? 120000 : call.name === "search_web" ? 35000 : 15000)]),
      headers: { "Content-Type": "application/json", "Accept-Language": this.options.locale },
      body: JSON.stringify({ name: call.name, arguments: JSON.parse(call.arguments), receipt: this.receipt, scope: this.options.scope, locale: this.options.locale, caseId: this.options.caseId, ...(call.name === "ask_text_assistant" ? { userTurn, previousAssistant: this.previousAssistant } : {}) }),
    });
    if (!response.ok) return { error: "unavailable", instruction: call.name === "search_web" ? "Internet search failed or is unavailable. Say you could not verify this online; never invent search results or links." : "The site query failed. Say the data is unavailable; do not invent counts or messages." };
    return (await response.json()).output;
  }
  stop() {
    if (this.closed) return;
    this.closed = true;
    this.abort.abort(); clearTimeout(this.timeout); clearTimeout(this.duration);
    this.turns?.close(); this.channel?.close(); this.peer?.close();
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    if (this.audio) { this.audio.pause(); this.audio.srcObject = null; }
    this.options.onState("ended");
  }
}
