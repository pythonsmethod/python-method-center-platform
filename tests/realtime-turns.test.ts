import { describe, expect, it, vi } from "vitest";
import { RealtimeTurns } from "@/lib/assistant/realtime-turns";

function setup() {
  const send = vi.fn(), saved = vi.fn(), incomplete = vi.fn();
  const turns = new RealtimeTurns(send, saved, incomplete);
  const input = (id = "u1", text = "Hello") => {
    turns.receive({ type: "input_audio_buffer.committed", item_id: id });
    turns.receive({ type: "conversation.item.input_audio_transcription.completed", item_id: id, transcript: text });
  };
  const created = (id = "u1", responseId = "r1") => turns.receive({ type: "response.created", response: { id: responseId, metadata: { input_item_id: id } } });
  const done = (status = "completed", responseId = "r1") => turns.receive({ type: "response.done", response: { id: responseId, status, output: [{ id: "a1", content: [{ type: "audio", transcript: "Hi there" }] }] } });
  const played = (responseId = "r1") => turns.receive({ type: "output_audio_buffer.stopped", response_id: responseId });
  return { turns, send, saved, incomplete, input, created, done, played };
}
describe("realtime turn reconciliation", () => {
  it("publishes recognition and reply deltas before final persistence", () => {
    const preview = vi.fn(), save = vi.fn(); const turns = new RealtimeTurns(vi.fn(), save, vi.fn(), { onTranscript: preview });
    turns.receive({ type: "input_audio_buffer.committed", item_id: "u" });
    turns.receive({ type: "conversation.item.input_audio_transcription.completed", item_id: "u", transcript: "Question" });
    expect(preview).toHaveBeenLastCalledWith({ turnId: "u", user: "Question", assistant: "", live: true });
    turns.receive({ type: "response.created", response: { id: "r", metadata: { input_item_id: "u" } } });
    turns.receive({ type: "response.output_audio_transcript.delta", response_id: "r", delta: "First " });
    turns.receive({ type: "response.output_audio_transcript.delta", response_id: "other", delta: "WRONG" });
    turns.receive({ type: "response.output_audio_transcript.delta", response_id: "r", delta: "words" });
    expect(preview).toHaveBeenLastCalledWith({ turnId: "u", user: "Question", assistant: "First words", live: true }); expect(save).not.toHaveBeenCalled();
    turns.close(); expect(save).toHaveBeenCalledWith({ turnId: "u", user: "Question", assistant: "First words", state: "interrupted" });
  });
  it.each([false, true])("resumes with actual tool output, discarding late results after stop=%s", async stop => {
    let resolve!: (value: unknown) => void;
    const tool = vi.fn(() => new Promise(r => { resolve = r; })), send = vi.fn(), save = vi.fn();
    const turns = new RealtimeTurns(send, save, vi.fn(), { tool });
    turns.receive({ type: "input_audio_buffer.committed", item_id: "u" });
    turns.receive({ type: "conversation.item.input_audio_transcription.completed", item_id: "u", transcript: "How many?" });
    turns.receive({ type: "response.created", response: { id: "r", metadata: { input_item_id: "u" } } });
    const done = { type: "response.done", response: { id: "r", status: "completed", output: [{ type: "function_call", id: "f1", call_id: "call1", name: "registration_counts", arguments: "{}" }] } };
    turns.receive(done); turns.receive(done); expect(tool).toHaveBeenCalledOnce();
    if (stop) turns.close();
    resolve({ registeredClientAccounts: 12 }); await Promise.resolve(); await Promise.resolve();
    if (stop) { expect(send).toHaveBeenCalledOnce(); expect(save.mock.calls[0][0].state).toBe("interrupted"); }
    else {
      expect(send.mock.calls[1][0].item).toMatchObject({ type: "function_call_output", call_id: "call1", output: '{"registeredClientAccounts":12}' });
      expect(send.mock.calls[2][0].response.input.map((i: { id: string }) => i.id)).toEqual(["u", "f1", send.mock.calls[1][0].item.id]);
      turns.receive({ type: "response.created", response: { id: "r2", metadata: { input_item_id: "u" } } });
      turns.receive({ type: "response.done", response: { id: "r2", status: "completed", output: [{ id: "a", content: [{ type: "audio", transcript: "12 accounts" }] }] } });
      expect(save).not.toHaveBeenCalled(); turns.receive({ type: "output_audio_buffer.stopped", response_id: "r2" });
      expect(save).toHaveBeenCalledExactlyOnceWith({ turnId: "u", user: "How many?", assistant: "12 accounts" });
    }
  });
  it("saves only after final generation and actual playback completion", () => {
    const s = setup(); s.input(); s.created(); s.done();
    expect(s.saved).not.toHaveBeenCalled(); s.played();
    expect(s.saved).toHaveBeenCalledExactlyOnceWith({ turnId: "u1", user: "Hello", assistant: "Hi there" });
    s.done(); s.played(); expect(s.saved).toHaveBeenCalledTimes(1);
  });
  it("handles playback completion arriving before response.done", () => {
    const s = setup(); s.input(); s.created(); s.played(); expect(s.saved).not.toHaveBeenCalled(); s.done(); expect(s.saved).toHaveBeenCalledTimes(1);
  });
  it("orders delayed recognition by committed item IDs and specifies exact context", () => {
    const s = setup();
    s.turns.receive({ type: "input_audio_buffer.committed", item_id: "u1" });
    s.input("u2", "second"); expect(s.send).not.toHaveBeenCalled();
    s.turns.receive({ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "first" });
    expect(s.send.mock.calls[0][0].response.input).toEqual([{ type: "item_reference", id: "u1" }]);
    s.created(); s.done(); s.played();
    expect(s.send.mock.calls[1][0].response).toEqual({ metadata: { input_item_id: "u2" }, input: ["u1", "a1", "u2"].map(id => ({ type: "item_reference", id })) });
  });
  it.each(["cancelled", "failed", "incomplete"])("labels %s answers as interrupted", status => {
    const s = setup(); s.input(); s.created(); s.done(status); s.played(); expect(s.saved).toHaveBeenCalledExactlyOnceWith({ turnId: "u1", user: "Hello", assistant: "Hi there", state: "interrupted" }); expect(s.incomplete).toHaveBeenCalledOnce();
  });
  it("preserves an answer interrupted after generation with an explicit label", () => {
    const s = setup(); s.input(); s.created(); s.done();
    s.turns.receive({ type: "input_audio_buffer.speech_started" }); s.played(); expect(s.saved).toHaveBeenCalledExactlyOnceWith({ turnId: "u1", user: "Hello", assistant: "Hi there", state: "interrupted" });
  });
  it("marks an answer interrupted during generation", () => {
    const s = setup(); s.input(); s.created();
    s.turns.receive({ type: "input_audio_buffer.speech_started" }); s.done(); s.played(); expect(s.saved).toHaveBeenCalledExactlyOnceWith({ turnId: "u1", user: "Hello", assistant: "Hi there", state: "interrupted" });
  });
  it("ignores another response's done/playback events", () => {
    const s = setup(); s.input(); s.created(); s.done("completed", "other"); s.played("other"); expect(s.saved).not.toHaveBeenCalled();
    s.done(); s.played(); expect(s.saved).toHaveBeenCalledOnce();
  });
  it("skips failed transcription and continues to the next turn", () => {
    const s = setup(); s.turns.receive({ type: "input_audio_buffer.committed", item_id: "bad" }); s.input();
    s.turns.receive({ type: "conversation.item.input_audio_transcription.failed", item_id: "bad" });
    expect(s.send.mock.calls[0][0].response.metadata.input_item_id).toBe("u1"); expect(s.incomplete).toHaveBeenCalledOnce();
  });
  it("deduplicates input events and keeps recognized user words on close", () => {
    const s = setup(); s.input(); s.input(); expect(s.send).toHaveBeenCalledOnce(); s.turns.close(); expect(s.saved).toHaveBeenCalledExactlyOnceWith({ turnId: "u1", user: "Hello", assistant: "", state: "interrupted" }); expect(s.incomplete).toHaveBeenCalledOnce();
  });
  it("marks cleared output and rejects empty/oversized recognition", () => {
    const s = setup(); s.input(); s.created(); s.turns.receive({ type: "output_audio_buffer.cleared", response_id: "r1" }); s.done(); s.played();
    s.input("empty", " "); s.input("huge", "x".repeat(12001)); expect(s.saved).toHaveBeenCalledExactlyOnceWith({ turnId: "u1", user: "Hello", assistant: "Hi there", state: "interrupted" }); expect(s.send).toHaveBeenCalledOnce();
  });
});
