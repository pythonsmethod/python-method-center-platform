// One-time state assessment pricing approved 2026-09-19.
// The former temporary 299 USD review becomes the permanent standalone entry
// service. It is not a support period and it does not include the formula.
export const REVIEW_PRODUCT = "preliminary_assessment" as const;
export const REVIEW_PRICE_USD = 299;

export function reviewPriceUsd(_now = new Date()): number {
  return REVIEW_PRICE_USD;
}

export function getReviewCopy(locale: "ru" | "en", _now = new Date()) {
  const ru = locale === "ru";
  const title = ru
    ? "Оценка состояния, разбор анализов и предварительная консультация"
    : "Condition assessment, test-results review and preliminary consultation";
  const description = ru
    ? "Оценка текущего состояния, разбор актуальных анализов и предварительная консультация по личному протоколу реабилитации от Professor Python. Ответ поступает в личный кабинет после подтверждения оплаты и получения необходимых материалов. Личное сопровождение и формула в эту услугу не входят."
    : "An assessment of your current condition, review of current test results and a preliminary consultation on your personal rehabilitation protocol by Professor Python. The response is delivered in your personal account after payment is confirmed and the required materials are received. Personal support and the formula are not included.";
  const price = ru ? "299 USD — разовая оплата" : "299 USD — one-time payment";
  const cta = ru ? "Получить оценку состояния" : "Get my condition assessment";

  return {
    title,
    description,
    price,
    promo: {
      badge: ru ? "Оценка состояния" : "Condition assessment",
      titlePaid: title,
      titleFree: title,
      textPaid: description,
      textFree: description,
      pricePaid: price,
      priceFree: price,
      priceAmount: "",
      cta,
      ctaFree: cta,
      note: ru
        ? "Разовая услуга. Покупка не обязывает приобретать дальнейшее сопровождение."
        : "One-time service. Purchasing it does not obligate you to purchase ongoing support."
    },
    details: {
      title: ru ? "Что именно вы получите" : "What you receive",
      lead: ru
        ? "Оценка состояния, разбор анализов и предварительная консультация."
        : "Condition assessment, test-results review and a preliminary consultation.",
      items: [
        {
          q: ru ? "Сколько стоит услуга?" : "How much does it cost?",
          a: ru ? "299 USD. Разовая оплата." : "299 USD. One-time payment."
        },
        {
          q: ru ? "Что входит?" : "What is included?",
          a: description
        },
        {
          q: ru ? "В каком виде придёт ответ?" : "How will I receive the response?",
          a: ru
            ? "В личном кабинете с ответом Professor Python."
            : "In your personal account with Professor Python's response."
        },
        {
          q: ru ? "Можно ли задать вопросы?" : "Can I ask questions?",
          a: ru
            ? "Да. Вопросы по полученной оценке можно задать в предусмотренный для этой услуги период общения."
            : "Yes. You can ask questions about the assessment during the communication period provided with this service."
        },
        {
          q: ru ? "Обязательно ли покупать сопровождение?" : "Do I have to purchase ongoing support?",
          a: ru
            ? "Нет. Оценка состояния — самостоятельная услуга. Личное сопровождение можно приобрести отдельно."
            : "No. The condition assessment is a standalone service. Personal support can be purchased separately."
        },
        {
          q: ru ? "Чем это отличается от сопровождения?" : "How is this different from Personal Support?",
          a: ru
            ? "Это разовая оценка состояния и предварительная консультация. Личное сопровождение — длительная работа с вашим кейсом по оплачиваемым 30-дневным периодам."
            : "This is a one-time condition assessment and preliminary consultation. Personal Support is ongoing work with your case in paid 30-day periods."
        },
        {
          q: ru ? "Какие анализы подойдут?" : "Which test results can I submit?",
          a: ru
            ? "Актуальные анализы и обследования. Если нужны дополнительные материалы, команда сообщит об этом в кабинете."
            : "Current test results and examinations. If additional materials are needed, the team will tell you in your account."
        }
      ],
      pageCtaTitle: ru ? "Как получить оценку" : "How to get your assessment",
      pageCtaText: ru
        ? "Создайте аккаунт, заполните анкету, загрузите материалы и оплатите услугу."
        : "Create an account, complete the questionnaire, upload your materials and pay for the service.",
      pageCta: ru ? "Перейти к оплате" : "Go to payment"
    }
  };
}
