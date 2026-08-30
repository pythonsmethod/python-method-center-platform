import type { AssistantErrorCode } from "@/lib/assistant/claude";
import { getLocale, type Locale } from "@/lib/i18n/locale";

// What an endpoint says when it refuses.
//
// These sentences reach the reader directly: the assistant window prints
// whatever the server sent, preferring it over its own fallback, and so does
// the cabinet. They were written in Russian only, so an English visitor who
// sent one message too many, or attached a file the server would not take,
// was answered in a language they had not chosen — on a page that is
// otherwise entirely in theirs.
//
// Staff-only endpoints are deliberately absent: the workspace is Russian by
// decision, not by omission.
const API_ERRORS = {
  ru: {
    accessDenied: "Нет доступа.",
    assistantEmptyReply: "Ассистент не смог ответить. Попробуйте ещё раз.",
    assistantOverloaded: "Ассистент перегружен. Попробуйте через минуту.",
    assistantTemporarilyDown:
      "Ассистент временно недоступен. Попробуйте позже.",
    assistantUnavailable:
      "ИИ-помощник ещё не подключён. Напишите нам через страницу «Поддержка».",
    assistantUnreachable:
      "Не удалось связаться с ассистентом. Попробуйте позже.",
    attachmentsPaidOnly:
      "Чтение приложенных файлов доступно персональному ИИ после начала сопровождения. Сейчас вы можете загрузить анализы в кабинете — их лично разберёт Professor Python.",
    attachmentsRejected:
      "Файлы не прошли проверку. Обновите страницу и попробуйте ещё раз.",
    audioMissing: "Аудио не получено.",
    audioNotSaved: "Не удалось сохранить аудио. Попробуйте ещё раз.",
    audioTooLong: "Голосовое слишком длинное (максимум ~10 МБ).",
    audioUnsupported: "Неподдерживаемый формат аудио.",
    badRequest: "Некорректный запрос.",
    caseNotFound: "Кейс не найден.",
    caseRequired: "Сначала заполните анкету — она создаст ваш кейс.",
    chessGameInvalid: "Некорректная партия.",
    chessGameNotSaved: "Не удалось сохранить партию.",
    chessLevelInvalid: "Некорректный уровень.",
    chessLevelNotSaved: "Не удалось сохранить уровень.",
    chessPositionInvalid: "Некорректная позиция партии.",
    chessPositionMissing: "Позиция партии недоступна.",
    invalidCase: "Некорректный кейс.",
    messageNotSent: "Не удалось отправить сообщение. Попробуйте ещё раз.",
    rateLimited: "Слишком много сообщений подряд. Подождите минуту.",
    serviceUnavailable: "Сервис временно недоступен.",
    signInRequired: "Войдите в аккаунт.",
    threadNotLoaded: "Не удалось загрузить переписку."
  },
  en: {
    accessDenied: "You do not have access to this.",
    assistantEmptyReply: "The assistant could not answer. Please try again.",
    assistantOverloaded: "The assistant is overloaded. Try again in a minute.",
    assistantTemporarilyDown:
      "The assistant is temporarily unavailable. Please try later.",
    assistantUnavailable:
      "The AI assistant is not connected yet. Write to us through the Support page.",
    assistantUnreachable: "The assistant could not be reached. Please try later.",
    attachmentsPaidOnly:
      "Reading attached files is part of the personal AI that comes with a support programme. For now you can upload your test results in the cabinet — Professor Python reviews them himself.",
    attachmentsRejected:
      "The files did not pass the check. Refresh the page and try again.",
    audioMissing: "No audio was received.",
    audioNotSaved: "The audio could not be saved. Please try again.",
    audioTooLong: "That voice message is too long (about 10 MB maximum).",
    audioUnsupported: "That audio format is not supported.",
    badRequest: "The request was not valid.",
    caseNotFound: "Case not found.",
    caseRequired: "Fill in the questionnaire first — it creates your case.",
    chessGameInvalid: "That game is not valid.",
    chessGameNotSaved: "The game could not be saved.",
    chessLevelInvalid: "That level is not valid.",
    chessLevelNotSaved: "The level could not be saved.",
    chessPositionInvalid: "That board position is not valid.",
    chessPositionMissing: "The board position is unavailable.",
    invalidCase: "That case reference is not valid.",
    messageNotSent: "The message could not be sent. Please try again.",
    rateLimited: "Too many messages in a row. Wait a minute and try again.",
    serviceUnavailable: "The service is temporarily unavailable.",
    signInRequired: "Sign in to your account.",
    threadNotLoaded: "The conversation could not be loaded."
  }
} as const satisfies Record<Locale, Record<string, string>>;

export type ApiErrorKey = keyof (typeof API_ERRORS)["ru"];

export function apiError(key: ApiErrorKey, locale: Locale): string {
  return API_ERRORS[locale][key];
}

// The cookie is the same one every page reads, so an endpoint answers in the
// language the reader is actually looking at, whatever the request body says.
export async function apiErrorLocale(): Promise<Locale> {
  return getLocale();
}

// The providers report why they failed with a code; the sentence that goes
// back to the reader is chosen here, in their language. Falls back to the
// provider's own text if a new code ever arrives without a translation.
const ASSISTANT_FAILURES: Record<AssistantErrorCode, ApiErrorKey> = {
  emptyReply: "assistantEmptyReply",
  overloaded: "assistantOverloaded",
  temporarilyDown: "assistantTemporarilyDown",
  unreachable: "assistantUnreachable"
};

export function assistantFailure(
  result: { message: string; code?: AssistantErrorCode },
  locale: Locale
): string {
  const key = result.code ? ASSISTANT_FAILURES[result.code] : undefined;

  return key ? apiError(key, locale) : result.message;
}
