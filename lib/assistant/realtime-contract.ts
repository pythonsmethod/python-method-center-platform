import type { Locale } from "@/lib/i18n/locale";

export type VoiceScope = "client" | "founder" | "karen";
export type VoiceState = "idle" | "permission" | "connecting" | "listening" | "thinking" | "speaking" | "reading" | "searching" | "ended" | "error";
export const voiceCopy = {
  ru: {
    close: "Закрыть и завершить разговор", conversationText: "Текст голосового разговора",
    callHint: "Говорите с Анхамом. Ваши слова и его ответы появятся здесь и останутся в чате.",
    voiceDetails: "О голосовом разговоре и сохранении текста",
    start: "Говорить с Анхамом", stop: "Завершить разговор", retry: "Попробовать снова",
    idle: "Живой голосовой диалог", permission: "Разрешите доступ к микрофону…",
    connecting: "Подключаюсь…", listening: "Слушаю вас", thinking: "Анхам готовит ответ…",
    speaking: "Анхам говорит", ended: "Разговор завершён", error: "Разговор остановлен",
    reading: "Анхам проверяет данные сайта…", searching: "Анхам ищет в интернете…",
    staffDisclosure: "Ваши слова и ответы Анхама появляются здесь текстом и сохраняются в истории. Это голос ИИ. При запуске вы разрешаете передавать речь голосовому сервису, а по вашему вопросу — данные сайта и клиентов, включая переписку, анкеты и имеющиеся медицинские записи. Для интернет-поиска общий запрос передаётся внешнему поисковому сервису. Ответы и ссылки сохраняются здесь. Анхам использует права текстового помощника: читает сведения и по вашей прямой команде может сохранить внутреннюю заметку. Действия, требующие подтверждения, остаются на подтверждении. Аудиофайл не записывается.",
    disclosure: "Вы услышите голос ИИ. Нажимая кнопку, вы разрешаете передать речь внешнему голосовому сервису и сохранить реплики текстом. Платформа не записывает аудиофайл. Это тест клиентского помощника. В разговор передаются доступные сведения только о вашем случае и ваша история чата. Анхам не ставит диагнозы и не назначает лечение.",
    unsupported: "Голос требует HTTPS и браузера с поддержкой микрофона и WebRTC.",
    denied: "Доступ к микрофону не разрешён. Разрешите его в настройках сайта и повторите попытку.",
    microphone: "Микрофон недоступен или занят другим приложением.",
    unavailable: "Голосовой режим ещё не подключён или недоступен этому аккаунту.",
    unauthorized: "Войдите в аккаунт, чтобы начать разговор.", forbidden: "Нет доступа к этому голосовому диалогу.",
    invalid: "Не удалось обработать запрос голосового диалога.",
    limit: "Лимит голосовых разговоров достигнут. Попробуйте позже.",
    connection: "Не удалось поддержать соединение. Проверьте сеть и повторите попытку.",
    playback: "Браузер не разрешил воспроизведение голоса. Повторите запуск разговора.",
    interrupted: "Реплика прервана. В тексте отмечено, что ответ мог прозвучать не полностью.",
    saving: "Сохраняю текст разговора…", saved: "Текст разговора сохранён в истории.",
    saveError: "Текст ещё не сохранён. Повторите сохранение до закрытия диалога.",
    retrySave: "Повторить сохранение", transcript: "Голосовая расшифровка может содержать ошибки. Проверяйте важные слова и числа.",
    duration: "Время тестового разговора истекло. Можно начать новый.",
  },
  en: {
    close: "Close and end conversation", conversationText: "Voice conversation text",
    callHint: "Talk to Anham. Your words and replies will appear here and remain in the chat.",
    voiceDetails: "About voice conversations and saved text",
    start: "Talk to Anham", stop: "End conversation", retry: "Try again",
    idle: "Live voice conversation", permission: "Allow microphone access…",
    connecting: "Connecting…", listening: "Listening to you", thinking: "Anham is preparing a reply…",
    speaking: "Anham is speaking", ended: "Conversation ended", error: "Conversation stopped",
    reading: "Anham is checking site data…", searching: "Anham is searching the web…",
    staffDisclosure: "Your words and Anham’s replies appear here as text and are saved in history. This is an AI voice. Starting allows speech to be sent to the voice service and, when you ask, site and client data, including correspondence, questionnaires and existing medical records. For web searches, a public-topic query is sent to an external search service. Answers and links are saved here. Anham uses the same permissions as the text assistant: it reads records and can save an internal note on your explicit command. Actions requiring confirmation remain pending. No audio file is recorded.",
    disclosure: "You will hear an AI voice. Starting allows speech to be sent to an external voice service and turns to be saved as text. The platform does not record an audio file. This is a client assistant preview. Only available information about your own case and your chat history is supplied. Anham does not diagnose or prescribe treatment.",
    unsupported: "Voice requires HTTPS and a browser with microphone and WebRTC support.",
    denied: "Microphone permission was denied. Allow it in the site settings and try again.",
    microphone: "The microphone is unavailable or in use by another application.",
    unavailable: "Voice is not configured yet or is unavailable for this account.",
    unauthorized: "Sign in to start a conversation.", forbidden: "You do not have access to this voice conversation.",
    invalid: "Could not process the voice conversation request.",
    limit: "The voice conversation limit has been reached. Try again later.",
    connection: "The connection could not be maintained. Check your network and try again.",
    playback: "The browser blocked voice playback. Start the conversation again.",
    interrupted: "Turn interrupted. The text is marked to show that the reply may not have been fully spoken.",
    saving: "Saving conversation text…", saved: "Conversation text is saved in your history.",
    saveError: "Text has not been saved yet. Retry saving before closing the conversation.",
    retrySave: "Retry saving", transcript: "Voice transcription can contain errors. Check important words and numbers.",
    duration: "The test conversation time has elapsed. You can start another one.",
  },
} as const;
export type VoiceError = "unsupported" | "denied" | "microphone" | "unavailable" | "unauthorized" | "forbidden" | "invalid" | "limit" | "connection" | "playback";
export function voiceErrorMessage(code: unknown, locale: Locale): string {
  return voiceCopy[locale][typeof code === "string" && ["unsupported", "denied", "microphone", "unavailable", "unauthorized", "forbidden", "invalid", "limit", "connection", "playback"].includes(code) ? code as VoiceError : "connection"];
}
