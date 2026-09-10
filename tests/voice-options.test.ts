import { afterEach, describe, expect, it, vi } from "vitest";
import { availableVoices, resolveOutputVoice } from "@/lib/assistant/voice-options-server";
import { BUILTIN_VOICES, voiceSelectionCopy } from "@/lib/assistant/voice-options";
import type { VoiceActor } from "@/lib/assistant/realtime-server";
import { inspectVoiceWav, provisionVoice } from "../scripts/ankh/provision-personal-voice.mjs";

const actor: VoiceActor = { profileId: "test-person", email: "test@example.test", scope: "founder", tier: "registered", caseId: null };
afterEach(() => vi.unstubAllEnvs());
describe("reviewed voice choices", () => {
  it("hides and rejects personal voices in the authorized built-ins-only release", () => {
    vi.stubEnv("ANHAM_VOICE_BUILTINS_ONLY", "true");
    vi.stubEnv("ANHAM_CUSTOM_VOICES_ENABLED", "true");
    vi.stubEnv("ANHAM_KAREN_VOICE_ID", "voice_synthetic");
    vi.stubEnv("ANHAM_KAREN_VOICE_CONSENT_ID", "cons_synthetic");
    expect(availableVoices(actor, "ru").voices).toHaveLength(5);
    expect(() => resolveOutputVoice(actor, "karen")).toThrow();
  });
  it.each(BUILTIN_VOICES)("resolves built-in %s without altering persona", voice => {
    expect(resolveOutputVoice(actor, voice)).toBe(voice);
    expect(resolveOutputVoice({ ...actor, scope: "client" }, voice)).toBe(voice);
  });
  it("offers exactly five built-ins and unavailable personal slots without provider references", () => {
    vi.stubEnv("ANHAM_CUSTOM_VOICES_ENABLED", "false");
    const result = availableVoices(actor, "ru");
    expect(result.voices.filter(v => v.available)).toHaveLength(5);
    expect(result.voices.filter(v => v.custom)).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Голос Карена", available: false })]));
    expect(availableVoices({ ...actor, scope: "client" }, "en").voices).toHaveLength(5);
    expect(result.preferenceKey).not.toContain(actor.profileId);
    expect(result.preferenceKey).not.toBe(availableVoices({ ...actor, scope: "karen" }, "ru").preferenceKey);
    expect(result.preferenceKey).not.toBe(availableVoices({ ...actor, profileId: "another-person" }, "ru").preferenceKey);
  });
  it("uses only fully configured, consent-linked personal voices for staff", () => {
    vi.stubEnv("ANHAM_CUSTOM_VOICES_ENABLED", "true"); vi.stubEnv("ANHAM_KAREN_VOICE_ID", "voice_synthetic");
    expect(() => resolveOutputVoice(actor, "karen")).toThrow();
    vi.stubEnv("ANHAM_KAREN_VOICE_CONSENT_ID", "cons_synthetic");
    expect(resolveOutputVoice(actor, "karen")).toEqual({ id: "voice_synthetic" });
    expect(() => resolveOutputVoice({ ...actor, scope: "client" }, "karen")).toThrow();
    expect(JSON.stringify(availableVoices(actor, "en"))).not.toContain("voice_synthetic");
    expect(JSON.stringify(availableVoices(actor, "en"))).not.toContain("cons_synthetic");
    vi.stubEnv("ANHAM_CUSTOM_VOICES_ENABLED", "false"); expect(() => resolveOutputVoice(actor, "karen")).toThrow();
  });
  it.each(["voice_external", { id: "voice_external" }, "fable", "", null])("rejects an unreviewed voice: %j", voice => { expect(() => resolveOutputVoice(actor, voice)).toThrow(); });
  it("keeps a valid configured default and falls back from unsupported defaults", () => {
    vi.stubEnv("OPENAI_REALTIME_VOICE", "cedar"); expect(resolveOutputVoice(actor, undefined)).toBe("cedar");
    vi.stubEnv("OPENAI_REALTIME_VOICE", "unexpected"); expect(resolveOutputVoice(actor, undefined)).toBe("marin");
  });
  it("provides equivalent RU/EN selection copy", () => {
    expect(Object.keys(voiceSelectionCopy.ru)).toEqual(Object.keys(voiceSelectionCopy.en));
    expect(Object.values(voiceSelectionCopy.en).join(" ")).not.toMatch(/[А-Яа-я]/);
  });
});

function wav(seconds = 2, sampleValue = 1) {
  const bytes = Buffer.alloc(44 + 32000 * seconds, sampleValue);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24); bytes.writeUInt32LE(32000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(bytes.length - 44, 40); return bytes;
}
describe("consented personal voice provisioning", () => {
  const input = () => ({ owner: "founder", language: "ru", consentAudio: wav(), sampleAudio: wav(3, 2), apiKey: "synthetic-key", enabled: true, ownerConfirmed: true });
  it("validates two separate recordings locally by default, without provider calls", async () => {
    const fetcher = vi.fn(), checkpoint = vi.fn();
    expect(await provisionVoice(input(), { fetcher, checkpoint })).toEqual({ dryRun: true, consentSeconds: 2, sampleSeconds: 3 });
    expect(fetcher).not.toHaveBeenCalled(); expect(checkpoint).not.toHaveBeenCalled();
  });
  it("requires explicit execute, eligibility, owner confirmation and existing key", async () => {
    const fetcher = vi.fn();
    for (const change of [{ enabled: false }, { ownerConfirmed: false }, { apiKey: "" }]) {
      await expect(provisionVoice({ ...input(), ...change, execute: true }, { fetcher })).rejects.toThrow();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects mismatched formats, truncated or excessive audio and duplicate recordings", async () => {
    expect(() => inspectVoiceWav(Buffer.from("Not audio"))).toThrow();
    expect(() => inspectVoiceWav(wav(31))).toThrow(); expect(() => inspectVoiceWav(wav().subarray(0, 60))).toThrow();
    await expect(provisionVoice({ ...input(), sampleAudio: wav() })).rejects.toThrow();
  });
  it("creates consent first, binds the voice to it, and stores no recording or key in checkpoints", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ id: "cons_test" })).mockResolvedValueOnce(Response.json({ id: "voice_test" })), checkpoint = vi.fn();
    const result = await provisionVoice({ ...input(), execute: true }, { fetcher, checkpoint });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.openai.com/v1/audio/voice_consents");
    expect(fetcher.mock.calls[1][1].body.get("consent")).toBe("cons_test");
    expect(result).toMatchObject({ phase: "voice_created", voiceId: "voice_test", consentId: "cons_test" });
    expect(JSON.stringify(checkpoint.mock.calls)).not.toContain("synthetic-key");
    expect(JSON.stringify(checkpoint.mock.calls)).not.toContain("consentAudio");
  });
  it("does not repeat an uncertain provider creation", async () => {
    const checkpoint = vi.fn(), fetcher = vi.fn().mockRejectedValue(new Error("private provider diagnostic"));
    await expect(provisionVoice({ ...input(), execute: true }, { fetcher, checkpoint })).rejects.toThrow("not confirmed");
    const previous = checkpoint.mock.calls.at(-1)![0];
    expect(previous.phase).toBe("consent_unknown"); fetcher.mockClear();
    await expect(provisionVoice({ ...input(), execute: true, previous }, { fetcher })).rejects.toThrow("Reconcile");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
