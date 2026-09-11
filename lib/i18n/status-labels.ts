import type { Locale } from "@/lib/i18n/locale";

type Labels = Record<string, string>;
type LocalizedLabels = Record<Locale, Labels>;

const documentStatusLabels: LocalizedLabels = {
  ru: { uploaded: "Загружен", queued: "В очереди", ready: "Обработан", processing: "Обрабатывается", accepted: "Принят", needs_reupload: "Нужна повторная загрузка", failed: "Временная ошибка обработки", identity_mismatch: "Похоже, документ другого человека", archived: "В архиве" },
  en: { uploaded: "Uploaded", queued: "Queued", ready: "Processed", processing: "Processing", accepted: "Accepted", needs_reupload: "Upload again", failed: "Temporary processing error", identity_mismatch: "Looks like someone else's document", archived: "Archived" }
};
const lifecycleEventLabels: LocalizedLabels = {
  ru: { case_created: "Кейс создан", onboarding_submitted: "Анкета отправлена", payment_recorded: "Оплата зафиксирована", service_period_started: "Период сопровождения начат", service_period_completed: "Период сопровождения завершён", support_requested: "Отправлено обращение в поддержку", escalation_created: "Создана эскалация", consent_recorded: "Зафиксировано согласие", admin_note_added: "Добавлена заметка команды" },
  en: { case_created: "Case created", onboarding_submitted: "Questionnaire submitted", payment_recorded: "Payment recorded", service_period_started: "Support period started", service_period_completed: "Support period completed", support_requested: "Support request sent", escalation_created: "Escalation created", consent_recorded: "Consent recorded", admin_note_added: "Team note added" }
};
const paymentProductLabels: LocalizedLabels = {
  ru: { preliminary_assessment: "Разбор анализов", support_5_weeks: "Сопровождение — 5 недель", support_15_weeks: "Сопровождение — 100 дней", test_access: "Архивный тестовый доступ" },
  en: { preliminary_assessment: "Analyses review", support_5_weeks: "Support — 5 weeks", support_15_weeks: "Support — 100 days", test_access: "Archived test access" }
};
const paymentStatusLabels: LocalizedLabels = {
  ru: { not_required: "Не требуется", pending: "Ожидает оплаты", paid: "Оплачен", failed: "Не прошёл", refunded: "Возвращён", partially_refunded: "Возвращён частично" },
  en: { not_required: "Not required", pending: "Awaiting payment", paid: "Paid", failed: "Failed", refunded: "Refunded", partially_refunded: "Partially refunded" }
};

function labelFor(map: LocalizedLabels, value: string, locale: Locale): string {
  return map[locale][value] ?? value.replaceAll("_", " ");
}

export const documentStatusLabel = (value: string, locale: Locale = "ru") => labelFor(documentStatusLabels, value, locale);

// What the client is shown for their own uploads.
//
// The full list above is the team's: it carries values from two different
// database lifecycles at once, so a client could meet "Загружен", "В
// очереди" and "Обрабатывается" as if they were three separate stages of
// their document, and "Обработан" and "Принят" as if those differed. None
// of that is theirs to follow. They see the file being worked on, or done —
// and if it ends badly, the case chat says so in words.
const clientDocumentStatusLabels: LocalizedLabels = {
  ru: {
    ready: "Готово",
    archived: "В архиве",
    needs_reupload: "Нужен новый файл",
    failed: "Нужен новый файл",
    // Stopped before reading: the header names somebody else. The case chat
    // explains and asks the person to confirm or remove the file.
    identity_mismatch: "Нужна проверка"
  },
  en: {
    ready: "Ready",
    archived: "Archived",
    needs_reupload: "Needs a new file",
    failed: "Needs a new file",
    identity_mismatch: "Needs checking"
  }
};

const clientDocumentInProgress: Record<Locale, string> = {
  ru: "В работе",
  en: "In progress"
};

export function clientDocumentStatusLabel(
  value: string,
  locale: Locale = "ru"
): string {
  return clientDocumentStatusLabels[locale][value] ?? clientDocumentInProgress[locale];
}
export const lifecycleEventLabel = (value: string, locale: Locale = "ru") => labelFor(lifecycleEventLabels, value, locale);
export const paymentProductLabel = (value: string, locale: Locale = "ru") => labelFor(paymentProductLabels, value, locale);
export const paymentStatusLabel = (value: string, locale: Locale = "ru") => labelFor(paymentStatusLabels, value, locale);
