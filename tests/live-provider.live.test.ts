import { createRequire } from "node:module";
import { expect, it } from "vitest";
import { aiFetch, attachLiveSession } from "@/lib/security/ai-transport";

// Opt-in provider check, only synthetic fixed greeting; never loads client data.
// LIVE_TEST_PLAYWRIGHT points to an installed Playwright module directory.
it.skipIf(process.env.RUN_LIVE_PROVIDER_TEST !== "true")("real GPT-Live WebRTC, trusted sideband and final usage", async () => {
  const key = process.env.GPT_LIVE_OPENAI_API_KEY;
  if (!key || !process.env.LIVE_TEST_PLAYWRIGHT) throw new Error("Provider test configuration missing");
  const { chromium } = createRequire(import.meta.url)(process.env.LIVE_TEST_PLAYWRIGHT);
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  let providerId: string | undefined;
  let socket: ReturnType<typeof attachLiveSession> | undefined;
  try {
    const offer = await page.evaluate(async () => {
      const peer = new RTCPeerConnection();
      const audio = new AudioContext(); const output = audio.createMediaStreamDestination();
      peer.addTrack(output.stream.getAudioTracks()[0], output.stream);
      const channel = peer.createDataChannel("oai-events");
      Object.assign(window, { liveTest: { peer, audio, output, channel } });
      peer.ontrack = event => { const element = document.createElement("audio"); element.autoplay = true; element.srcObject = event.streams[0]; document.body.append(element); };
      await peer.setLocalDescription(await peer.createOffer());
      if (peer.iceGatheringState !== "complete") await new Promise<void>(resolve => { peer.onicegatheringstatechange = () => { if (peer.iceGatheringState === "complete") resolve(); }; });
      return peer.localDescription!.sdp;
    });
    const response = await aiFetch("https://api.openai.com/v1/live/sessions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ session: { model: "gpt-live-1", instructions: "You are Anham, an AI assistant. Briefly greet the synthetic speaker in English. This is a connectivity check, with no personal data.", audio: { output: { voice: "marin" } } }, transport: { type: "webrtc", sdp: offer } }) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.info("Provider validation", String(body.error?.message ?? "").replaceAll(key, "[redacted]").slice(0,600));
      throw new Error(`Live create HTTP ${response.status}; code=${String(body.error?.code ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "")}`);
    }
    const created = await response.json(); providerId = created.session.id;
    socket = attachLiveSession(providerId!, key);
    const events: Record<string, unknown>[] = [];
    socket.on("message", raw => { const event = JSON.parse(raw.toString()); if (!String(event.type).includes("audio.delta")) events.push(event); });
    await new Promise<void>((resolve, reject) => { socket!.once("open", resolve); socket!.once("error", () => reject(new Error("Sideband connection failed"))); });
    await page.evaluate(async (sdp: string) => {
      const test = (window as unknown as { liveTest: { peer: RTCPeerConnection } }).liveTest;
      await test.peer.setRemoteDescription({ type: "answer", sdp });
    }, created.transport.sdp);
    const speech = await aiFetch("https://api.openai.com/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: "marin", input: "Hello! I am Anham, your AI assistant. This is what my voice sounds like." }) });
    if (!speech.ok) throw new Error(`Synthetic greeting HTTP ${speech.status}`);
    const bytes = Array.from(new Uint8Array(await speech.arrayBuffer()));
    await page.waitForFunction(() => (window as unknown as { liveTest: { peer: RTCPeerConnection } }).liveTest.peer.connectionState === "connected", { timeout: 20000 });
    await page.evaluate(async (data: number[]) => {
      const t = (window as unknown as { liveTest: { audio: AudioContext; output: MediaStreamAudioDestinationNode } }).liveTest;
      await t.audio.resume(); const source = t.audio.createBufferSource();
      source.buffer = await t.audio.decodeAudioData(new Uint8Array(data).buffer); source.connect(t.output); source.start();
    }, bytes);
    await new Promise(r => setTimeout(r, 12000));
    socket.send(JSON.stringify({ type: "session.close" }));
    await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Missing session.closed")), 8000);
      const poll = setInterval(() => { if (events.some(e => e.type === "session.closed")) { clearTimeout(timer); clearInterval(poll); resolve(); } }, 100); });
    const closed = events.find(e => e.type === "session.closed");
    console.info("Live provider evidence", { eventTypes: [...new Set(events.map(e => e.type))], usage: closed?.usage });
    expect(events.some(e => e.type === "session.started")).toBe(true);
    expect(events.some(e => e.type === "session.input_transcript.delta")).toBe(true);
    expect(events.some(e => e.type === "session.output_transcript.delta")).toBe(true);
    expect(closed?.usage).toHaveProperty("seconds");
  } finally {
    socket?.close(); await browser.close();
    if (providerId) await aiFetch(`https://api.openai.com/v1/live/sessions/${providerId}/hangup`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
  }
}, 60000);
