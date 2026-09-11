import type { Locale } from "@/lib/i18n/locale";
import type { VoiceError, VoiceState } from "./realtime-contract";
import type { VoiceTranscript } from "./realtime-turns";
import type { LiveFragment } from "./live-transcript";
import { LiveDisplay } from "./live-transcript";
type Options = { locale: Locale; scope: "client" | "staff"; caseId?: string; voice: string;
  onState: (s: VoiceState) => void; onError: (s: VoiceError) => void; onTranscript: (t: VoiceTranscript) => void;
  onSaving: (s: "saving" | "saved" | "saveError") => void; onUsage: (seconds: number, usd: number, finalized: boolean) => void };

export class LiveBrowser {
  private peer?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private microphone?: MediaStream;
  private audio?: HTMLAudioElement;
  private context?: AudioContext;
  private frame = 0;
  private abort = new AbortController();
  private stopped = false;
  private muted = false;
  private thinking = false;
  private playing = false;
  private started = false;
  private retries = 0;
  private generation = 0;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private disconnectTimer?: ReturnType<typeof setTimeout>;
  private finalState: VoiceState = "ended";
  private seconds = 0;
  private usd = 0;
  private previousSeconds = 0;
  private previousUsd = 0;
  private display = new LiveDisplay();
  constructor(private options: Options) {}
  async start() {
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") return this.fail("unsupported");
    this.options.onState("permission");
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.stopped) { microphone.getTracks().forEach(t => t.stop()); return; }
      this.microphone = microphone;
      await this.connect();
    } catch (error) {
      if (!this.stopped) this.fail(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "microphone");
    }
  }
  private state() {
    if (this.started && !this.stopped) this.options.onState(this.muted ? "muted" : this.playing ? "speaking" : this.thinking ? "thinking" : "listening");
  }
  mute() {
    this.muted = !this.muted;
    this.microphone?.getTracks().forEach(t => { t.enabled = !this.muted; });
    if (this.channel?.readyState === "open") this.channel.send(JSON.stringify({ type: this.muted ? "session.input_audio.mute" : "session.input_audio.unmute" }));
    this.state();
  }
  pause() { this.finalState = "paused"; this.stop(); }
  stop() {
    if (this.stopped) return; this.stopped = true;
    this.microphone?.getTracks().forEach(t => t.stop());
    if (this.channel?.readyState === "open") {
      this.channel.send(JSON.stringify({ type: "session.close" }));
      this.closeTimer = setTimeout(() => this.dispose(), 6500);
    } else this.dispose();
    this.options.onState(this.finalState);
  }
  private fail(code: VoiceError) { this.finalState = "error"; this.options.onError(code); this.stopped = true; this.dispose(); this.options.onState("error"); }
  private releasePeer() {
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.disconnectTimer = undefined;
    cancelAnimationFrame(this.frame); this.channel?.close(); this.peer?.close();
    if (this.audio) { this.audio.pause(); this.audio.srcObject = null; }
    void this.context?.close().catch(() => {}); this.context = undefined;
  }
  private dispose() {
    this.display.finish().forEach(t => this.options.onTranscript(t));
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.abort.abort(); this.releasePeer(); this.microphone?.getTracks().forEach(t => t.stop());
  }
  private async connect() {
    const generation = ++this.generation;
    this.abort = new AbortController(); this.started = false; this.thinking = false;
    this.options.onState(this.retries ? "reconnecting" : "connecting");
    const peer = new RTCPeerConnection(); this.peer = peer;
    const channel = peer.createDataChannel("oai-events"); this.channel = channel;
    const audio = document.createElement("audio"); audio.autoplay = true; this.audio = audio;
    peer.ontrack = e => {
      audio.srcObject = e.streams[0];
      void audio.play().catch(() => this.fail("playback"));
      const context = new AudioContext(); this.context = context;
      const analyser = context.createAnalyser(); analyser.fftSize = 256;
      context.createMediaStreamSource(e.streams[0]).connect(analyser);
      void context.resume();
      const values = new Uint8Array(256); let lastSound = 0;
      const meter = () => {
        if (generation !== this.generation || this.stopped) return;
        analyser.getByteTimeDomainData(values);
        if (values.some(v => Math.abs(v - 128) > 5)) lastSound = performance.now();
        this.playing = performance.now() - lastSound < 350; this.state();
        this.frame = requestAnimationFrame(meter);
      }; meter();
    };
    this.microphone!.getTracks().forEach(track => peer.addTrack(track, this.microphone!));
    peer.onconnectionstatechange = () => {
      if (generation !== this.generation || this.stopped) return;
      if (peer.connectionState === "connected") { if (this.disconnectTimer) clearTimeout(this.disconnectTimer); this.disconnectTimer = undefined; this.state(); }
      if (peer.connectionState === "disconnected" || peer.connectionState === "failed") {
        this.options.onState("reconnecting");
        if (!this.disconnectTimer) this.disconnectTimer = setTimeout(() => { this.abort.abort(); }, 8000);
      }
    };
    try {
      await peer.setLocalDescription(await peer.createOffer());
      if (peer.iceGatheringState !== "complete") await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { peer.removeEventListener("icegatheringstatechange", check); reject(new Error("ice")); }, 8000);
        const check = () => { if (peer.iceGatheringState === "complete") { clearTimeout(timer); peer.removeEventListener("icegatheringstatechange", check); resolve(); } };
        peer.addEventListener("icegatheringstatechange", check); check();
      });
      if (this.stopped) return;
      this.display.finish().forEach(t => this.options.onTranscript(t));
      const response = await fetch("/api/assistant/live", { method: "POST", credentials: "same-origin", signal: this.abort.signal,
        headers: { "Content-Type": "application/json", "Accept-Language": this.options.locale },
        body: JSON.stringify({ sdp: peer.localDescription?.sdp, consent: true, locale: this.options.locale, scope: this.options.scope,
          caseId: this.options.caseId, voice: this.options.voice, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      if (!response.ok || !response.body) { const error = await response.json().catch(() => ({})); this.fail(error.code ?? "connection"); return; }
      const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.length > 150000) throw new Error("oversized_event");
        let end: number;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const block = buffer.slice(0,end); buffer = buffer.slice(end+2);
          if (!block.startsWith("data: ")) continue;
          const event = JSON.parse(block.slice(6));
          if (event.type === "connected") await peer.setRemoteDescription({ type: "answer", sdp: event.sdp });
          if (event.type === "started") { this.started = true; this.state(); }
          if (event.type === "transcript") {
            const f = event.fragment as LiveFragment;
            this.options.onTranscript(this.display.receive(f));
            this.options.onSaving("saving");
          }
          if (event.type === "saved") this.options.onSaving("saved");
          if (event.type === "save_error") { this.options.onSaving("saveError"); this.fail("unavailable"); return; }
          if (event.type === "thinking") { this.thinking = event.active; this.state(); }
          if (event.type === "backend_result" && event.memoryPending) {
            this.options.onTranscript({ turnId: `memory_${event.taskId}`, user: "", assistant: event.reply, live: false });
          }
          if (event.type === "usage") { this.seconds = event.seconds; this.usd = typeof event.estimatedUsd === "number" ? event.estimatedUsd : 0; this.options.onUsage(this.previousSeconds + this.seconds, this.previousUsd + this.usd, false); }
          if (event.type === "error") { this.options.onError(event.code); }
          if (event.type === "ended") {
            this.seconds = event.seconds;
            this.options.onUsage(this.previousSeconds + event.seconds, this.previousUsd + this.usd, event.finalized && this.retries === 0);
            if (event.reason === "connection_lost" && !this.stopped) throw new Error("lost_connection");
            if (event.finalized || this.stopped) { this.stopped = true; this.dispose(); this.options.onState(this.finalState); return; }
          }
        }
      }
      if (!this.stopped) throw new Error("lost_stream");
    } catch {
      if (this.stopped) return;
      this.previousSeconds += this.seconds; this.previousUsd += this.usd; this.seconds = 0; this.usd = 0;
      this.releasePeer();
      if (++this.retries <= 2) { await new Promise(r => setTimeout(r, 2000)); if (!this.stopped) await this.connect(); }
      else this.fail("connection");
    }
  }
}
