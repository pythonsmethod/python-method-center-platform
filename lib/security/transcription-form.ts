/** Bounded dictation input for the reviewed transport. No prompts or extra fields. */
export function safeTranscriptionForm(input: unknown): FormData {
  if (!(input instanceof FormData)) throw new Error("AI_BODY_DENIED");
  const allowed = new Set(["file", "model", "language"]);
  for (const key of input.keys()) if (!allowed.has(key) || input.getAll(key).length !== 1) throw new Error("AI_BODY_DENIED");
  const file = input.get("file");
  const language = input.get("language");
  if (!(file instanceof File) || file.size < 100 || file.size > 5 * 1024 * 1024 || !/^audio\/(webm|mp4|ogg|mpeg|wav|x-wav)(;|$)/i.test(file.type)) throw new Error("AI_BODY_DENIED");
  if (input.get("model") !== "gpt-4o-mini-transcribe" || !["ru", "en"].includes(String(language))) throw new Error("AI_BODY_DENIED");
  const ext = file.type.includes("mp4") ? "mp4" : file.type.includes("ogg") ? "ogg" : file.type.includes("wav") ? "wav" : file.type.includes("mpeg") ? "mp3" : "webm";
  const result = new FormData();
  result.set("file", file, `dictation.${ext}`);
  result.set("model", "gpt-4o-mini-transcribe");
  result.set("language", String(language));
  return result;
}
