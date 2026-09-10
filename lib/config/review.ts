// One-time review pricing, approved 2026-09-08. All amounts are final USD totals.
export const REVIEW_PRODUCT = "preliminary_assessment" as const;
export const REVIEW_TEMPORARY_USD = 299;
export const REVIEW_STANDARD_USD = 500;
// Before 1 December 2026, America/Los_Angeles (PST, UTC-08:00).
export const REVIEW_PRICE_END = "2026-12-01T08:00:00.000Z";
export function reviewPriceUsd(now = new Date()): number {
  return now.getTime() < Date.parse(REVIEW_PRICE_END) ? REVIEW_TEMPORARY_USD : REVIEW_STANDARD_USD;
}
export function getReviewCopy(locale: "ru" | "en", now = new Date()) {
  const ru = locale === "ru";
  const temporary = reviewPriceUsd(now) === REVIEW_TEMPORARY_USD;
  const title = ru ? "Полный разбор анализов от Карена" : "Full test-results review by Karen";
  const description = ru
    ? "Полный разбор анализов и рекомендации Карена (Professor Python) по восстановлению и реабилитации. Ответ — файлом в личном кабинете в течение трёх рабочих дней после подтверждения оплаты и получения всех материалов. Затем — три рабочих дня чата для вопросов. Длительное сопровождение и формула в этот тариф не входят."
    : "A full review of your test results with recovery and rehabilitation recommendations from Karen (Professor Python). Your report arrives in your personal account within three working days after payment is confirmed and all materials are received, followed by three working days of chat for questions. Ongoing support and the formula are not included.";
  const price = temporary
    ? (ru ? "299 USD вместо 500 USD — до 1 декабря 2026 года (по времени Лос-Анджелеса)" : "299 USD instead of 500 USD — until 1 December 2026 (Los Angeles time)")
    : "500 USD";
  const cta = ru ? "Получить полный разбор" : "Get the full review";
  return {
    title, description, price,
    promo: {
      badge: ru ? "Разбор анализов" : "Test-results review",
      titlePaid: title, titleFree: title, textPaid: description, textFree: description,
      pricePaid: price, priceFree: price, priceAmount: "", cta, ctaFree: cta,
      note: ru ? "Итоговая стоимость без дополнительных сборов. Это экспертное мнение; оно не заменяет консультацию лечащего врача." : "Final price with no additional fees. This is an expert opinion and does not replace your doctor's consultation."
    },
    details: {
      title: ru ? "Что именно вы получите" : "What you receive",
      lead: ru ? "Состав разбора, стоимость и сроки." : "Review contents, pricing and timing.",
      items: [
        { q: ru ? "Сколько стоит разбор?" : "How much does the review cost?", a: price + (ru ? ". С 1 декабря 2026 года — 500 USD. Дополнительных сборов нет." : ". From 1 December 2026, the price is 500 USD. No additional fees.") },
        { q: ru ? "Что входит?" : "What is included?", a: description },
        { q: ru ? "В каком виде придёт ответ?" : "How will I receive the report?", a: ru ? "Отдельным файлом в личном кабинете с ответом Карена." : "As a separate file in your personal account with Karen's response." },
        { q: ru ? "Сколько ждать?" : "How long does it take?", a: ru ? "До трёх рабочих дней после подтверждения оплаты и получения всех материалов." : "Up to three working days after payment confirmation and receipt of all materials." },
        { q: ru ? "Можно ли задать вопросы?" : "Can I ask questions?", a: ru ? "Да, три рабочих дня после разбора открыт чат с Кареном." : "Yes. Chat with Karen is available for three working days after the review." },
        { q: ru ? "Обязательно ли покупать сопровождение?" : "Do I have to purchase ongoing support?", a: ru ? "Нет. Разбор — самостоятельная услуга. Сопровождение можно приобрести отдельно." : "No. The review is a standalone service. Ongoing support can be purchased separately." },
        { q: ru ? "Это полный разбор или предварительный?" : "Is this a full or preliminary review?", a: ru ? "Полный разбор анализов с рекомендациями Карена по восстановлению и реабилитации." : "A full review of your test results with Karen's recommendations for recovery and rehabilitation." },
        { q: ru ? "Какие анализы подойдут?" : "Which test results can I submit?", a: ru ? "Анализы и чек-апы за последние 30 дней; дополнительные материалы можно согласовать с командой." : "Test results and check-ups from the past 30 days; ask the team about additional materials." }
      ],
      pageCtaTitle: ru ? "Как получить разбор" : "How to get your review",
      pageCtaText: ru ? "Создайте аккаунт, заполните анкету, загрузите анализы и оплатите разбор." : "Create an account, complete the questionnaire, upload your test results and pay for the review.",
      pageCta: ru ? "Перейти к оплате разбора" : "Go to review payment"
    }
  };
}
