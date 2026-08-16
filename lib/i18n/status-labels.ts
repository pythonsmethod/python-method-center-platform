import type { Locale } from "@/lib/i18n/locale";

type Labels = Record<string, string>;
type LocalizedLabels = Record<Locale, Labels>;

const caseStatusLabels: LocalizedLabels = {
  ru: { created: "Создан", awaiting_onboarding: "Ожидает анкету", ready_for_review: "Передан на изучение", in_review: "Изучается командой", active_support: "Активное сопровождение", inactive_support: "Сопровождение приостановлено", completed: "Завершён", archived: "В архиве" },
  en: { created: "Created", awaiting_onboarding: "Awaiting questionnaire", ready_for_review: "Submitted for review", in_review: "Under team review", active_support: "Active support", inactive_support: "Support paused", completed: "Completed", archived: "Archived" }
};
const caseUrgencyLabels: LocalizedLabels = {
  ru: { normal: "Обычная", elevated: "Повышенная", critical: "Критическая" },
  en: { normal: "Normal", elevated: "Elevated", critical: "Critical" }
};
const caseDirectionLabels: LocalizedLabels = {
  ru: { recovery: "Восстановление", rehabilitation: "Реабилитация", preservation: "Сохранение состояния", not_set: "Не определено" },
  en: { recovery: "Recovery", rehabilitation: "Rehabilitation", preservation: "Condition preservation", not_set: "Not set" }
};
const documentStatusLabels: LocalizedLabels = {
  ru: { uploaded: "Загружен", queued: "В очереди", ready: "Обработан", processing: "Обрабатывается", accepted: "Принят", needs_reupload: "Нужна повторная загрузка", archived: "В архиве" },
  en: { uploaded: "Uploaded", queued: "Queued", ready: "Processed", processing: "Processing", accepted: "Accepted", needs_reupload: "Upload again", archived: "Archived" }
};
const supportStatusLabels: LocalizedLabels = {
  ru: { open: "Открыт", in_progress: "В работе", waiting_on_client: "Ждёт вашего ответа", escalated_to_karen: "Передан Professor Python", resolved: "Решён", closed: "Закрыт" },
  en: { open: "Open", in_progress: "In progress", waiting_on_client: "Waiting for your reply", escalated_to_karen: "Escalated to Professor Python", resolved: "Resolved", closed: "Closed" }
};
const lifecycleEventLabels: LocalizedLabels = {
  ru: { case_created: "Кейс создан", onboarding_submitted: "Анкета отправлена", status_changed: "Статус кейса изменён", payment_recorded: "Оплата зафиксирована", service_period_started: "Период сопровождения начат", service_period_completed: "Период сопровождения завершён", support_requested: "Отправлено обращение в поддержку", escalation_created: "Создана эскалация", consent_recorded: "Зафиксировано согласие", admin_note_added: "Добавлена заметка команды" },
  en: { case_created: "Case created", onboarding_submitted: "Questionnaire submitted", status_changed: "Case status changed", payment_recorded: "Payment recorded", service_period_started: "Support period started", service_period_completed: "Support period completed", support_requested: "Support request sent", escalation_created: "Escalation created", consent_recorded: "Consent recorded", admin_note_added: "Team note added" }
};
const paymentProductLabels: LocalizedLabels = {
  ru: { preliminary_assessment: "Предварительная оценка", support_5_weeks: "Сопровождение — 5 недель", support_15_weeks: "Сопровождение — 100 дней", test_access: "Архивный тестовый доступ" },
  en: { preliminary_assessment: "Preliminary assessment", support_5_weeks: "Support — 5 weeks", support_15_weeks: "Support — 100 days", test_access: "Archived test access" }
};
const paymentStatusLabels: LocalizedLabels = {
  ru: { not_required: "Не требуется", pending: "Ожидает оплаты", paid: "Оплачен", failed: "Не прошёл", refunded: "Возвращён", partially_refunded: "Возвращён частично" },
  en: { not_required: "Not required", pending: "Awaiting payment", paid: "Paid", failed: "Failed", refunded: "Refunded", partially_refunded: "Partially refunded" }
};

function labelFor(map: LocalizedLabels, value: string, locale: Locale): string {
  return map[locale][value] ?? value.replaceAll("_", " ");
}

export const caseStatusLabel = (value: string, locale: Locale = "ru") => labelFor(caseStatusLabels, value, locale);
export const caseUrgencyLabel = (value: string, locale: Locale = "ru") => labelFor(caseUrgencyLabels, value, locale);
export const caseDirectionLabel = (value: string, locale: Locale = "ru") => labelFor(caseDirectionLabels, value, locale);
export const documentStatusLabel = (value: string, locale: Locale = "ru") => labelFor(documentStatusLabels, value, locale);
export const supportStatusLabel = (value: string, locale: Locale = "ru") => labelFor(supportStatusLabels, value, locale);
export const lifecycleEventLabel = (value: string, locale: Locale = "ru") => labelFor(lifecycleEventLabels, value, locale);
export const paymentProductLabel = (value: string, locale: Locale = "ru") => labelFor(paymentProductLabels, value, locale);
export const paymentStatusLabel = (value: string, locale: Locale = "ru") => labelFor(paymentStatusLabels, value, locale);
