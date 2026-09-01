import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) => readFileSync(path, "utf8");
describe("support voice messages", () => {
  it("stores private audio", () => {
    const sql = read("supabase/migrations/20260901090000_support_voice_messages.sql");
    expect(sql).toContain("audio_path text");
    expect(sql).toContain("support-audio");
    expect(sql).toContain("body is not null or audio_path is not null");
  });
  it("authorizes upload ownership and renders playback", () => {
    expect(read("app/api/support/messages/audio/route.ts")).toContain("supportRequest.profile_id !== user.id");
    expect(read("components/support/SupportRequestThread.tsx")).toContain('<audio controls preload="metadata"');
  });
});
