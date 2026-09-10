import type { Locale } from "@/lib/i18n/locale";

export const BUILTIN_VOICES = ["marin", "cedar", "coral", "sage", "verse", "alloy", "ash", "ballad", "echo", "shimmer"] as const;
export type VoiceOption = { id: string; name: string; available: boolean; custom?: boolean };
export const builtinVoiceOptions: VoiceOption[] = BUILTIN_VOICES.map(id => ({ id, name: id[0].toUpperCase() + id.slice(1), available: true }));
export function isBuiltinVoice(value: unknown): value is typeof BUILTIN_VOICES[number] {
  return typeof value === "string" && (BUILTIN_VOICES as readonly string[]).includes(value);
}
export function customVoiceName(id: string, locale: Locale) {
  return id === "founder" ? (locale === "ru" ? "Голос основательницы" : "Founder's voice") : (locale === "ru" ? "Голос Карена" : "Karen's voice");
}
export const voiceSelectionCopy = {
  ru: { label: "Голос Анхама", next: "Новый голос прозвучит в следующем разговоре.", preview: "Послушать голос", previewStop: "Остановить пример", previewError: "Не удалось воспроизвести пример голоса.", pending: "ещё не подключён", customTitle: "Ваш голос и голос Карена", customInfo: "Для каждого личного голоса нужны запись согласия владельца и отдельный образец речи до 30 секунд. Подключение возможно после предоставления сервисом доступа к созданию личных голосов.", customIdentity: "Даже знакомым голосом отвечает ИИ — Анхам.", device: "Выбор сохраняется для этого аккаунта в этом браузере." },
  en: { label: "Anham's voice", next: "The new voice will be used in the next conversation.", preview: "Listen to voice", previewStop: "Stop preview", previewError: "Could not play the voice preview.", pending: "not connected yet", customTitle: "Your voice and Karen's voice", customInfo: "Each personal voice needs the owner's consent recording and a separate speech sample of up to 30 seconds. Connection requires the provider to grant access to custom voice creation.", customIdentity: "Even with a familiar voice, the speaker is Anham, an AI.", device: "Your choice is saved for this account in this browser." },
} as const;
