import { describe, expect, it } from "vitest";
import { LiveDisplay, liveFragment, liveMessages, coalesceLiveHistory } from "@/lib/assistant/live-transcript";
describe("Live full-duplex transcripts", () => {
  it("groups history within a session without mutating stored source or crossing sessions", () => {
    const prefix = "live:00000000-0000-4000-8000-000000000001:";
    const source = [
      { role: "user", content: "Hello", created_at: "2026-09-10T00:00:00Z", exchange_id: prefix + "a" },
      { role: "assistant", content: "Hi", created_at: "2026-09-10T00:00:00.010Z", exchange_id: prefix + "b" },
      { role: "user", content: " again", created_at: "2026-09-10T00:00:00.020Z", exchange_id: prefix + "c" },
      { role: "user", content: "Text message", created_at: "2026-09-10T00:00:00.030Z" },
    ];
    expect(coalesceLiveHistory(source).map(m => m.content)).toEqual(["Hello again", "Hi", "Text message"]);
    expect(source[0].content).toBe("Hello");
  });
  it("preserves token spaces and overlapping speakers without a turn boundary", () => {
    const fragments = [
      { id: "a", role: "user" as const, text: "Hello", start: 0, end: 100 },
      { id: "b", role: "user" as const, text: " ", start: 100, end: 101 },
      { id: "c", role: "assistant" as const, text: "Hi", start: 100, end: 200 },
      { id: "d", role: "user" as const, text: "again", start: 150, end: 300 },
    ];
    const display = new LiveDisplay(); const shown = fragments.map(f => display.receive(f));
    expect(shown[3]).toEqual({ turnId: "a", user: "Hello again", assistant: "", live: true, continuous: true });
    expect(shown[2].turnId).toBe("c");
    expect(liveMessages(fragments)[0].content).toBe("Hello ");
  });
  it("rejects non-transcripts, impossible timestamps, missing IDs and oversized input", () => {
    const valid = { type: "session.input_transcript.delta", event_id: "evt_1", delta: "да", start_ms: 0, end_ms: 10 };
    expect(liveFragment(valid)?.role).toBe("user");
    for (const patch of [{ type: "session.output_audio.delta" }, { end_ms: -1 }, { start_ms: Infinity }, { event_id: "../x" }, { delta: "x".repeat(12001) }]) expect(liveFragment({ ...valid, ...patch })).toBeNull();
  });
});
