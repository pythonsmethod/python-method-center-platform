// Russian labels for the founder timeline (pure maps, unit-tested).

export const auditActionLabels: Record<string, string> = {
  client_case_created: "Создан кейс клиента",
  onboarding_submitted: "Клиент заполнил анкету",
  offer_accepted: "Принята публичная оферта",
  consent_captured: "Записано согласие на обработку данных",
  document_uploaded: "Клиент загрузил документ",
  payment_recorded: "Записана оплата",
  case_state_updated: "Изменён статус кейса",
  support_request_created: "Создано обращение в поддержку",
  support_request_status_changed: "Изменён статус обращения"
};

export const lifecycleLabels: Record<string, string> = {
  case_created: "Кейс создан",
  onboarding_submitted: "Анкета отправлена",
  status_changed: "Смена статуса кейса",
  payment_recorded: "Оплата зафиксирована",
  service_period_started: "Начался период сопровождения",
  service_period_completed: "Период сопровождения завершён",
  support_requested: "Запрошена поддержка",
  consent_recorded: "Записано согласие",
  admin_note_added: "Добавлена заметка команды"
};

export const caseStatusLabels: Record<string, string> = {
  created: "Создан",
  awaiting_onboarding: "Ждёт анкету",
  ready_for_review: "Передан на изучение",
  in_review: "Изучается командой",
  active_support: "Активное сопровождение",
  inactive_support: "Сопровождение приостановлено",
  completed: "Завершён",
  archived: "В архиве"
};

export const actorRoleLabels: Record<string, string> = {
  client: "клиент",
  karen: "Professor Python",
  support: "поддержка",
  admin: "администратор",
  ai: "ИИ",
  system: "система"
};

export const notificationKindLabels: Record<string, string> = {
  client_message: "сообщение клиента",
  support_request: "обращение",
  payment: "оплата",
  processing_error: "ошибка обработки"
};

export const notificationStatusLabels: Record<string, string> = {
  pending: "отправляется",
  sent: "доставлено",
  failed: "не доставлено",
  skipped: "не настроено"
};

export const productLabels: Record<string, string> = {
  support_5_weeks: "Сопровождение — 5 недель",
  support_15_weeks: "Сопровождение — 100 дней",
  test_access: "Архивный тестовый доступ"
};

export function formatMoney(amountCents: number, currency = "USD"): string {
  const amount = (amountCents / 100).toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  return `${amount} ${currency === "USD" ? "$" : currency}`;
}

export function formatMoscowless(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
