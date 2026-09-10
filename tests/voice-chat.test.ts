import { describe, expect, it } from "vitest";
import { mergeVoiceTranscript, type VoiceChatMessage } from "@/lib/assistant/voice-chat";
describe("live voice text in the existing chat", () => {
  it("shows recognized words immediately and replaces streaming reply without duplicates", () => {
    let rows: VoiceChatMessage[] = [{ role: "assistant", content: "Existing text" }];
    rows = mergeVoiceTranscript(rows, { turnId: "1", user: "How many?", assistant: "", live: true }, "session");
    expect(rows.map(r => r.content)).toEqual(["Existing text", "How many?"]);
    rows = mergeVoiceTranscript(rows, { turnId: "1", user: "How many?", assistant: "There are", live: true }, "session");
    rows = mergeVoiceTranscript(rows, { turnId: "1", user: "How many?", assistant: "There are 12." }, "session");
    expect(rows).toHaveLength(3); expect(rows[2]).toMatchObject({ content: "There are 12.", voiceLive: false, voice_state: "completed" });
  });
  it("keeps paired reply before a later recognized question and isolates sessions", () => {
    let rows = mergeVoiceTranscript([], { turnId: "1", user: "First", assistant: "", live: true }, "a");
    rows = mergeVoiceTranscript(rows, { turnId: "2", user: "Second", assistant: "", live: true }, "a");
    rows = mergeVoiceTranscript(rows, { turnId: "1", user: "First", assistant: "Partial", state: "interrupted" }, "a");
    expect(rows.map(r => r.content)).toEqual(["First", "Partial", "Second"]);
    expect(rows[1].voice_state).toBe("interrupted");
    rows = mergeVoiceTranscript(rows, { turnId: "1", user: "Another session", assistant: "" }, "b");
    expect(rows).toHaveLength(4);
  });
});
