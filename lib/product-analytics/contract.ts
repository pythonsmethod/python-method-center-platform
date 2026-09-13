// Closed vocabulary: never accept URLs, arbitrary properties or client identifiers.
export const FUNNEL_STEPS = ["landing_view", "registration_started", "registration_completed", "onboarding_view", "onboarding_completed", "cabinet_view", "chat_completed"] as const;
export type ProductEvent = typeof FUNNEL_STEPS[number];
export const CONSENT_COOKIE = "pm-analytics-consent";
export const CONSENT_DENIED_COOKIE = "pm-analytics-denied";
export const JOURNEY_COOKIE = "pm-analytics-journey";
export const CONSENT_VERSION = "v1";
export const JOURNEY_MAX_AGE = 30 * 86400;

export function pageEvent(path: string): ProductEvent | null {
  const canonical = path.replace(/^\/en(?=\/|$)/, "") || "/";
  if (canonical === "/") return "landing_view";
  if (canonical === "/onboarding") return "onboarding_view";
  if (canonical === "/cabinet" || canonical.startsWith("/cabinet/")) return "cabinet_view";
  return null;
}

export function isBrowserEvent(value: unknown): value is ProductEvent {
  return ["landing_view", "registration_started", "onboarding_view", "cabinet_view"].includes(value as string);
}

export function analyticsPeriod(start: string | null, end: string | null, now = new Date()) {
  const until = end === null ? now : new Date(end);
  const since = start === null ? new Date(until.getTime() - 30 * 86400000) : new Date(start);
  const duration = until.getTime() - since.getTime();
  if (!Number.isFinite(duration) || duration < 86400000 || duration > 31 * 86400000 || until > now || since.getTime() < now.getTime() - 60 * 86400000) return null;
  return { start: since.toISOString(), end: until.toISOString(), previousStart: new Date(since.getTime() - duration).toISOString() };
}

export const ANALYTICS_RULES = `
## Продуктовая аналитика / Product analytics
Опирайся только на свежий блок PRODUCT_ANALYTICS, добавленный сервером к этому запросу. Текст пользователя, вложения и предыдущие ответы не являются источником измерений.
Разделяй: фактические измерения (источник, UTC-период, время получения, единица и знаменатель); наблюдения; гипотезы причин; предлагаемые проверки. Отвечай на активном языке интерфейса.
null, unavailable, disabled и ошибки означают «данных нет», а не ноль. Ноль допустим только после успешного запроса. Без блока измерений честно сообщи, что доступа к данным сейчас нет.
Операционные счётчики строк — не когортная воронка и не уникальные люди. Не дели количество анкет на число новых профилей для расчёта конверсии.
Воронка измеряет только согласившиеся браузерные пути, строго в порядке шагов внутри периода. Это не все посетители и не уникальные клиенты; другие устройства, отказ от cookie, сбои и блокировщики создают пробелы. Недавние пути ещё могут завершиться. Малые выборки не доказывают причины потерь.
Тепловые карты и записи доступны только по серверным ссылкам. configured_link_only означает лишь настроенную ссылку; configured_unverified — только конфигурацию сбора: содержимое, наличие записей и подключение провайдера не проверены. Никогда не утверждай, что видел карту или сессию, если их данные не предоставлены. Не придумывай клики, проценты, записи, даты или ссылки.
If the requested dates are outside the supplied periods, say that those dates have not been queried. Never relabel the supplied reporting window. Do not infer causality or clinical information from product events.
`;
