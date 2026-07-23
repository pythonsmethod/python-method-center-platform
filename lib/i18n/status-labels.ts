const caseStatusLabels: Record<string, string> = {
  created: "Создан",
  awaiting_onboarding: "Ожидает анкету",
  ready_for_review: "Передан на изучение",
  in_review: "Изучается командой",
  active_support: "Активное сопровождение",
  inactive_support: "Сопровождение приостановлено",
  completed: "Завершён",
  archived: "В архиве"
};

const caseUrgencyLabels: Record<string, string> = {
  normal: "Обычная",
  elevated: "Повышенная",
  critical: "Критическая"
};

const caseDirectionLabels: Record<string, string> = {
  recovery: "Восстановление",
  rehabilitation: "Реабилитация",
  preservation: "Сохранение состояния",
  not_set: "Не определено"
};

const documentStatusLabels: Record<string, string> = {
  uploaded: "Загружен",
  queued: "В очереди",
  ready: "Обработан",
  processing: "Обрабатывается",
  accepted: "Принят",
  needs_reupload: "Нужна повторная загрузка",
  archived: "В архиве"
};

const supportStatusLabels: Record<string, string> = {
  open: "Открыт",
  in_progress: "В работе",
  waiting_on_client: "Ждёт вашего ответа",
  escalated_to_karen: "Передан Карен",
  resolved: "Решён",
  closed: "Закрыт"
};

const lifecycleEventLabels: Record<string, string> = {
  case_created: "Кейс создан",
  onboarding_submitted: "Анкета отправлена",
  status_changed: "Статус кейса изменён",
  payment_recorded: "Оплата зафиксирована",
  service_period_started: "Период сопровождения начат",
  service_period_completed: "Период сопровождения завершён",
  support_requested: "Отправлено обращение в поддержку",
  escalation_created: "Создана эскалация",
  consent_recorded: "Зафиксировано согласие",
  admin_note_added: "Добавлена заметка команды"
};

const paymentProductLabels: Record<string, string> = {
  preliminary_assessment: "Предварительная оценка",
  support_5_weeks: "Сопровождение — 5 недель",
  support_15_weeks: "Сопровождение — 100 дней"
};

const paymentStatusLabels: Record<string, string> = {
  not_required: "Не требуется",
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  failed: "Не прошёл",
  refunded: "Возвращён",
  partially_refunded: "Возвращён частично"
};

function labelFor(map: Record<string, string>, value: string): string {
  return map[value] ?? value.replaceAll("_", " ");
}

export function caseStatusLabel(value: string): string {
  return labelFor(caseStatusLabels, value);
}

export function caseUrgencyLabel(value: string): string {
  return labelFor(caseUrgencyLabels, value);
}

export function caseDirectionLabel(value: string): string {
  return labelFor(caseDirectionLabels, value);
}

export function documentStatusLabel(value: string): string {
  return labelFor(documentStatusLabels, value);
}

export function supportStatusLabel(value: string): string {
  return labelFor(supportStatusLabels, value);
}

export function lifecycleEventLabel(value: string): string {
  return labelFor(lifecycleEventLabels, value);
}

export function paymentProductLabel(value: string): string {
  return labelFor(paymentProductLabels, value);
}

export function paymentStatusLabel(value: string): string {
  return labelFor(paymentStatusLabels, value);
}
