import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { mergeRefreshedMessages } from "@/lib/messages/merge";
import type { CaseMessage } from "@/lib/messages/queries";

const recorderSource = readFileSync(
  new URL("../components/messages/VoiceRecorder.tsx", import.meta.url),
  "utf8"
);

describe("voice message recording format", () => {
  it("prefers iPhone-compatible MP4/AAC before WebM", () => {
    const mp4 = recorderSource.indexOf('"audio/mp4;codecs=mp4a.40.2"');
    const webm = recorderSource.indexOf('"audio/webm;codecs=opus"');

    expect(mp4).toBeGreaterThan(-1);
    expect(webm).toBeGreaterThan(-1);
    expect(mp4).toBeLessThan(webm);
  });

  it("keeps the current signed URL while the chat polls", () => {
    const base: CaseMessage = {
      id: "voice-1",
      sender_role: "support",
      body: null,
      audio_path: "case/voice.webm",
      audio_duration_seconds: 42,
      created_at: "2026-08-18T15:54:44Z",
      audioUrl: "https://storage.example/voice?token=playing"
    };
    const refreshed = {
      ...base,
      audioUrl: "https://storage.example/voice?token=new-poll"
    };

    expect(mergeRefreshedMessages([base], [refreshed])[0].audioUrl).toBe(
      base.audioUrl
    );
    expect(mergeRefreshedMessages([base], [refreshed], true)[0].audioUrl).toBe(
      refreshed.audioUrl
    );
  });
});
