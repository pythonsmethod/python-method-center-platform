// Operator workflow: dry-run by default. No recordings, keys or provider bodies are logged.
import { readFile, writeFile, mkdir, open, rename, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function inspectVoiceWav(bytes) {
  if (bytes.length > 5_000_000 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new Error("Expected a PCM WAV recording under 5 MB.");
  let rate = 0, data = 0;
  for (let pos = 12; pos + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(pos + 4), end = pos + 8 + size;
    if (end > bytes.length) throw new Error("Truncated WAV recording.");
    const id = bytes.toString("ascii", pos, pos + 4);
    if (id === "fmt ") {
      if (size < 16 || bytes.readUInt16LE(pos + 8) !== 1) throw new Error("Use uncompressed PCM WAV.");
      const channels = bytes.readUInt16LE(pos + 10), samples = bytes.readUInt32LE(pos + 12), bits = bytes.readUInt16LE(pos + 22);
      rate = bytes.readUInt32LE(pos + 16);
      if (![1, 2].includes(channels) || bits !== 16 || samples < 16000 || samples > 48000 || rate !== samples * channels * 2 || bytes.readUInt16LE(pos + 20) !== channels * 2) throw new Error("Use 16-bit mono/stereo PCM WAV at 16–48 kHz.");
    }
    if (id === "data") data += size;
    pos = end + (size % 2);
  }
  if (!rate || data / rate < 1 || data / rate > 30) throw new Error("Recording must be between 1 and 30 seconds.");
  return { seconds: data / rate, fingerprint: createHash("sha256").update(bytes).digest("hex") };
}

export async function provisionVoice({ owner, language, consentAudio, sampleAudio, previous = null, execute = false, ownerConfirmed = false, enabled = false, apiKey = "" }, { fetcher = fetch, checkpoint = async () => {} } = {}) {
  if (!["founder", "karen"].includes(owner) || !["ru", "en"].includes(language)) throw new Error("Select founder or karen and ru or en.");
  const consent = inspectVoiceWav(consentAudio), sample = inspectVoiceWav(sampleAudio);
  if (consent.fingerprint === sample.fingerprint) throw new Error("Consent and voice sample must be separate recordings.");
  const identity = { owner, language, consentHash: consent.fingerprint, sampleHash: sample.fingerprint };
  if (previous && Object.entries(identity).some(([key, value]) => previous[key] !== value)) throw new Error("Saved operation belongs to different recordings or owner.");
  if (!execute) return { dryRun: true, consentSeconds: consent.seconds, sampleSeconds: sample.seconds };
  if (!enabled || !ownerConfirmed || !apiKey) throw new Error("Provider eligibility, the voice owner's confirmed consent and an existing server key are required.");
  if (previous?.phase === "voice_created") return previous;
  if (previous && previous.phase !== "consent_created") throw new Error("An earlier request may have reached the provider. Reconcile it before retrying; do not create a duplicate.");
  let progress = previous || identity;
  async function upload(kind, form, pattern) {
    progress = { ...progress, phase: `${kind}_pending` }; await checkpoint(progress);
    try {
      const response = await fetcher(`https://api.openai.com/v1/audio/${kind === "consent" ? "voice_consents" : "voices"}`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error();
      const result = await response.json(); if (!pattern.test(result.id)) throw new Error();
      progress = { ...progress, phase: `${kind}_created`, [`${kind}Id`]: result.id };
      await checkpoint(progress);
    } catch {
      // Retain pending even when persisting the uncertain state fails. Never auto-retry POSTs.
      await checkpoint({ ...progress, phase: `${kind}_unknown` });
      throw new Error("Provider creation was not confirmed. Inspect the private operation record before retrying.");
    }
  }
  if (!progress.consentId) {
    const form = new FormData(); form.set("name", `Anham ${owner} consent`); form.set("language", language);
    form.set("recording", new Blob([consentAudio], { type: "audio/wav" }), "consent.wav");
    await upload("consent", form, /^cons_[a-zA-Z0-9_-]+$/);
  }
  const form = new FormData(); form.set("name", `Anham ${owner} voice`); form.set("consent", progress.consentId);
  form.set("audio_sample", new Blob([sampleAudio], { type: "audio/wav" }), "sample.wav");
  await upload("voice", form, /^voice_[a-zA-Z0-9_-]+$/);
  return progress;
}

async function main() {
  const args = process.argv.slice(2), value = key => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : undefined; };
  const owner = value("--owner"), language = value("--language") || "ru";
  if (!["founder", "karen"].includes(owner) || !value("--consent") || !value("--sample")) throw new Error("Required: --owner founder|karen --consent <wav> --sample <wav> [--language ru|en]. Dry-run unless --execute --owner-confirmed are supplied.");
  const consentAudio = await readFile(path.resolve(value("--consent"))), sampleAudio = await readFile(path.resolve(value("--sample")));
  const directory = path.resolve(".private", "anham-voices", owner), manifest = path.join(directory, "operation.json");
  const execute = args.includes("--execute"), lockPath = path.join(directory, "operation.lock");
  let lock;
  if (execute) { await mkdir(directory, { recursive: true }); lock = await open(lockPath, "wx"); }
  try {
  let previous = null;
  try { previous = JSON.parse(await readFile(manifest, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw new Error("Private operation record could not be read."); }
  const result = await provisionVoice({ owner, language, consentAudio, sampleAudio, previous, execute, ownerConfirmed: args.includes("--owner-confirmed"), enabled: process.env.ANHAM_CUSTOM_VOICES_ENABLED === "true", apiKey: process.env.OPENAI_REALTIME_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim() || "" }, { checkpoint: async data => { const temporary = manifest + ".tmp"; await writeFile(temporary, JSON.stringify(data, null, 2), { mode: 0o600 }); await rename(temporary, manifest); } });
  process.stdout.write(result.dryRun ? "Recordings validated locally. No provider request made.\n" : "Voice creation confirmed. Provider references saved in the ignored private operation record. Runtime configuration is not changed automatically.\n");
  } finally { if (lock) { await lock.close(); await unlink(lockPath); } }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
