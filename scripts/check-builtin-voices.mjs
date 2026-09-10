// Explicit live smoke check. Reads one existing key; never prints or stores it.
import { readFile } from "node:fs/promises";
const file = process.argv[2];
if (!file) throw new Error("Existing env-file path required");
const contents = await readFile(file, "utf8");
const line = contents.split(/\r?\n/).find(line => line.startsWith("OPENAI_API_KEY="));
let key = line?.slice("OPENAI_API_KEY=".length).trim();
if (key?.startsWith('"') && key.endsWith('"')) key = JSON.parse(key);
if (!key) throw new Error("Existing key unavailable");
for (const voice of ["marin", "cedar", "coral", "sage", "verse"]) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: "Привет! Это проверка готового голоса Анхама.", response_format: "wav" }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.log(JSON.stringify({ voice, status: response.status, code: error.error?.code ?? "provider_error" }));
    process.exitCode = 1; break;
  }
  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.toString("ascii", 0, 4) !== "RIFF" || audio.length < 1000) throw new Error("Invalid provider WAV");
  console.log(JSON.stringify({ voice, status: response.status, audioBytes: audio.length }));
}
