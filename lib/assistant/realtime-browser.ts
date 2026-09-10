import { safeVoiceDiagnosticCode } from "./voice-diagnostics";
import { RealtimeTurns, type VoiceExchange, type VoiceTranscript, type VoiceToolCall } from "./realtime-turns";
import type { VoiceError, VoiceState } from "./realtime-contract";
import type { Locale } from "@/lib/i18n/locale";
const isClientTool = (name: string) => name === "search_conversation_history" || name === "read_conversation_message" || name === "read_my_case" || name === "search_web" || name === "prepare_my_cabinet_action" || name === "execute_my_cabinet_action";

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
  private disconnectTimeout?: ReturnType<typeof setTimeout>;
  private recovering = false;
  private lastState: VoiceState = "idle";
  private previousAssistant = "";
  constructor(private options: Options) {}

  async start() {
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") return this.fail("unsupported");
    this.setState("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      // A permission prompt may resolve after Stop or unmount.
      if (this.closed) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.setState("connecting");
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
        if (this.closed) return;
        const state = this.peer?.connectionState;
        if (state === "failed" || state === "closed") return this.fail("connection");
        if (state === "disconnected" && !this.recovering) {
          this.recovering = true;
          this.options.onState("reconnecting");
          this.disconnectTimeout = setTimeout(() => {
            if (!this.closed && this.recovering) this.fail("connection");
          }, 8000);
        } else if (state === "connected" && this.recovering) {
          clearTimeout(this.disconnectTimeout); this.recovering = false;
          this.setState(this.lastState);
        }
      };
      this.channel = this.peer.createDataChannel("oai-events");
      this.turns = new RealtimeTurns(event => {
        if (this.channel?.readyState === "open") this.channel.send(JSON.stringify(event));
      }, pair => { this.previousAssistant = pair.assistant; this.options.onExchange(pair, this.receipt); }, this.options.onIncomplete, { onTranscript: this.options.onTranscript, tool: (call, userTurn) => this.readSite(call, userTurn) });
      this.channel.onopen = () => {
        if (this.closed) return;
        clearTimeout(this.timeout);
        this.setState("listening");
      };
      this.channel.onclose = () => { if (!this.closed) this.fail("connection"); };
      this.channel.onerror = () => { if (!this.closed) this.fail("connection"); };
      this.channel.onmessage = message => {
        if (this.closed) return;
        try {
          const event = JSON.parse(message.data);
          if (event.type === "error") return this.fail("service", safeVoiceDiagnosticCode(event.error?.code ?? event.error?.type));
          this.turns?.receive(event);
          if (event.type === "input_audio_buffer.speech_started" || event.type === "output_audio_buffer.stopped" || event.type === "output_audio_buffer.cleared" || event.type === "conversation.item.input_audio_transcription.failed") this.setState("listening");
          if (event.type === "input_audio_buffer.speech_stopped" || event.type === "response.created") this.setState("thinking");
          if (event.type === "output_audio_buffer.started") this.setState("speaking");
        } catch { this.fail("service", "protocol"); }
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
  private setState(state: VoiceState) {
    this.lastState = state;
    this.options.onState(this.recovering && state !== "ended" && state !== "error" ? "reconnecting" : state);
  }
  private fail(error: VoiceError, diagnostic: string = error === "connection" ? "transport" : error === "playback" ? "playback" : "unknown") {
    if (this.closed) return;
    if (this.receipt) {
      // A bounded, independent request survives cleanup of the voice connection.
      void fetch("/api/assistant/realtime/diagnostics", {
        method: "POST", credentials: "same-origin", keepalive: true,
        signal: AbortSignal.timeout(5000), headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: this.receipt, scope: this.options.scope, caseId: this.options.caseId, locale: this.options.locale, voice: this.options.voice, code: safeVoiceDiagnosticCode(diagnostic) }),
      }).catch(() => undefined);
    }
    this.stop(); this.options.onError(error); this.setState("error");
  }
  private async readSite(call: VoiceToolCall, userTurn: { id: string; text: string }) {
    if (this.closed || (this.options.scope !== "staff" && !isClientTool(call.name))) return { error: "forbidden" };
    this.setState(call.name === "search_web" ? "searching" : "reading");
    if (call.arguments.length > 45_000) return { error: "invalid" };
    const response = await fetch("/api/assistant/realtime/tools", {
      method: "POST", credentials: "same-origin", signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(call.name === "ask_text_assistant" ? 120000 : call.name === "search_web" ? 35000 : 15000)]),
      headers: { "Content-Type": "application/json", "Accept-Language": this.options.locale },
      body: JSON.stringify({ name: call.name, arguments: JSON.parse(call.arguments), receipt: this.receipt, scope: this.options.scope, locale: this.options.locale, caseId: this.options.caseId, ...(["ask_text_assistant", "prepare_my_cabinet_action", "execute_my_cabinet_action"].includes(call.name) ? { userTurn, previousAssistant: this.previousAssistant } : {}) }),
    });
    if (!response.ok) return { error: "unavailable", instruction: call.name === "search_web" ? "Internet search failed or is unavailable. Say you could not verify this online; never invent search results or links." : "The site query failed. Say the data is unavailable; do not invent counts or messages." };
    return (await response.json()).output;
  }
  stop() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.disconnectTimeout); this.recovering = false;
    this.abort.abort(); clearTimeout(this.timeout); clearTimeout(this.duration);
    this.turns?.close(); this.channel?.close(); this.peer?.close();
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    if (this.audio) { this.audio.pause(); this.audio.srcObject = null; }
    this.setState("ended");
  }
}
