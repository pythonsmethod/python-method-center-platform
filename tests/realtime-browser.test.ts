import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeBrowser } from "@/lib/assistant/realtime-browser";

const peers: FakePeer[] = [];
const track = { stop: vi.fn(), onended: null as (() => void) | null };
const stream = { getTracks: () => [track] };
const audio = { autoplay: false, srcObject: null, play: vi.fn(), pause: vi.fn() };
class FakePeer {
  connectionState = "new";
  onconnectionstatechange?: () => void;
  ontrack?: (e: unknown) => void;
  channel = { readyState: "open", onopen: undefined as (() => void) | undefined, onclose: undefined as (() => void) | undefined, onerror: undefined as (() => void) | undefined, onmessage: undefined as ((e: { data: string }) => void) | undefined, close: vi.fn(), send: vi.fn() };
  addTrack = vi.fn(); close = vi.fn();
  createDataChannel = vi.fn(() => this.channel);
  createOffer = vi.fn(async () => ({ sdp: "v=0\r\noffer" }));
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async () => { this.channel.onopen?.(); });
  constructor() { peers.push(this); }
}
function setup() {
  const callbacks = { onState: vi.fn(), onError: vi.fn(), onIncomplete: vi.fn(), onDuration: vi.fn(), onExchange: vi.fn() };
  return { call: new RealtimeBrowser({ ...callbacks, scope: "client", locale: "en" }), ...callbacks };
}
beforeEach(() => {
  peers.length = 0;
  vi.useFakeTimers(); vi.clearAllMocks(); audio.play.mockResolvedValue(undefined);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  vi.stubGlobal("RTCPeerConnection", FakePeer);
  vi.stubGlobal("Audio", class { constructor() { return audio; } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ sdp: "v=0\r\nanswer", receipt: "test-receipt", maxSeconds: 300 }))));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("WebRTC lifecycle without a microphone or paid provider", () => {
  it.each(["read_my_case", "search_web", "read_site_data"])("routes client tool %s through the server boundary", async name => {
    const s = setup(); await s.call.start();
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ output: { result: "synthetic" } })));
    const event = (value: object) => peers[0].channel.onmessage?.({ data: JSON.stringify(value) });
    event({ type: "input_audio_buffer.committed", item_id: "u1" });
    event({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "Help me" });
    event({ type: "response.created", response: { id: "r1", metadata: { input_item_id: "u1" } } });
    event({ type: "response.done", response: { id: "r1", status: "completed", output: [{ type: "function_call", id: "f1", call_id: "c1", name, arguments: "{}" }] } });
    await vi.advanceTimersByTimeAsync(0);
    if (name === "read_site_data") {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(peers[0].channel.send.mock.calls.some(([raw]) => raw.includes("forbidden"))).toBe(true);
    } else {
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(vi.mocked(fetch).mock.calls[1][0]).toBe("/api/assistant/realtime/tools");
      expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string)).toMatchObject({ scope: "client", name, receipt: "test-receipt" });
    }
    s.call.stop();
  });
  it("passes the selected voice from the browser to the session API", async () => {
    const callbacks = { onState: vi.fn(), onError: vi.fn(), onIncomplete: vi.fn(), onDuration: vi.fn(), onExchange: vi.fn() };
    const call = new RealtimeBrowser({ ...callbacks, scope: "client", locale: "en", voice: "cedar" });
    await call.start();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).voice).toBe("cedar"); call.stop();
  });
  it("runs permission, connection, listening and stop; releases every resource", async () => {
    const s = setup(); await s.call.start();
    expect(s.onState.mock.calls.flat()).toEqual(["permission", "connecting", "listening"]);
    expect(peers[0].addTrack).toHaveBeenCalledWith(track, stream);
    s.call.stop(); s.call.stop();
    expect(track.stop).toHaveBeenCalledOnce(); expect(peers[0].close).toHaveBeenCalledOnce(); expect(peers[0].channel.close).toHaveBeenCalledOnce(); expect(audio.pause).toHaveBeenCalledOnce(); expect(audio.srcObject).toBeNull();
  });
  it("stops a late permission result after cancellation without contacting API", async () => {
    let permit: (value: typeof stream) => void = () => undefined;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation(() => new Promise(resolve => { permit = value => resolve(value as unknown as MediaStream); }));
    const s = setup(); const started = s.call.start(); s.call.stop(); permit(stream); await started;
    expect(track.stop).toHaveBeenCalledOnce(); expect(fetch).not.toHaveBeenCalled();
  });
  it("reports permission denial and unsupported browsers", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException("", "NotAllowedError"));
    const s = setup(); await s.call.start(); expect(s.onError).toHaveBeenCalledWith("denied");
    vi.stubGlobal("isSecureContext", false); const second = setup(); await second.call.start(); expect(second.onError).toHaveBeenCalledWith("unsupported");
  });
  it("reports missing microphone", async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException("", "NotFoundError"));
    const s = setup(); await s.call.start(); expect(s.onError).toHaveBeenCalledWith("microphone");
  });
  it("releases microphone after server rejects access", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ code: "forbidden" }), { status: 403 }));
    const s = setup(); await s.call.start(); expect(s.onError).toHaveBeenCalledWith("forbidden"); expect(track.stop).toHaveBeenCalledOnce();
  });
  it("closes on network disconnect and does not reconnect automatically", async () => {
    const s = setup(); await s.call.start(); peers[0].connectionState = "disconnected"; peers[0].onconnectionstatechange?.();
    expect(s.onError).toHaveBeenCalledWith("connection"); expect(track.stop).toHaveBeenCalledOnce(); expect(fetch).toHaveBeenCalledOnce();
  });
  it("handles output playback rejection", async () => {
    audio.play.mockRejectedValue(new DOMException("", "NotAllowedError")); const s = setup(); await s.call.start();
    peers[0].ontrack?.({ streams: [stream] }); await Promise.resolve(); expect(s.onError).toHaveBeenCalledWith("playback"); expect(track.stop).toHaveBeenCalledOnce();
  });
  it("enforces UI session duration", async () => {
    const s = setup(); await s.call.start(); await vi.advanceTimersByTimeAsync(300_000);
    expect(s.onDuration).toHaveBeenCalledOnce(); expect(track.stop).toHaveBeenCalledOnce();
  });
  it("times out stalled channel negotiation", async () => {
    // A pending fetch simulates negotiation stall.
    vi.mocked(fetch).mockReturnValue(new Promise(() => undefined));
    const s = setup(); void s.call.start(); await vi.advanceTimersByTimeAsync(30_000);
    expect(s.onError).toHaveBeenCalledWith("connection"); expect(track.stop).toHaveBeenCalledOnce();
  });
  it("shows speaking only on playback events and sends completed pairs", async () => {
    const s = setup(); await s.call.start();
    const event = (value: object) => peers[0].channel.onmessage?.({ data: JSON.stringify(value) });
    event({ type: "input_audio_buffer.committed", item_id: "u1" }); event({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "Hello" });
    event({ type: "response.created", response: { id: "r1", metadata: { input_item_id: "u1" } } });
    event({ type: "output_audio_buffer.started", response_id: "r1" }); expect(s.onState).toHaveBeenLastCalledWith("speaking");
    event({ type: "response.done", response: { id: "r1", status: "completed", output: [{ content: [{ type: "audio", transcript: "Hi" }] }] } });
    expect(s.onExchange).not.toHaveBeenCalled(); event({ type: "output_audio_buffer.stopped", response_id: "r1" });
    expect(s.onExchange).toHaveBeenCalledWith({ turnId: "u1", user: "Hello", assistant: "Hi" }, "test-receipt");
    s.call.stop();
  });
});
