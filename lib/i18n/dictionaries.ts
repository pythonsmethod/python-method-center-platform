import type { Locale } from "@/lib/i18n/locale";

// Public-site copy in both languages. The client cabinet and the admin
// workspace stay Russian for now (team-facing).

const ru = {
  nav: {
    "/": "Главная",
    "/login": "Вход",
    "/cabinet": "Кабинет",
    "/payment": "Оплата",
    "/support": "Поддержка"
  } as Record<string, string>,
  footer: {
    offer: "Публичная оферта",
    support: "Поддержка",
    team: "Для команды",
    socials: "Социальные сети"
  },
  landing: {
    eyebrow: "Цифровой реабилитационный центр",
    title: "Python Method Center",
    subtitle: "Индивидуальный путь к восстановлению, здоровью и новой жизни.",
    points: [
      "Экспертное сопровождение под руководством Карена",
      "Индивидуальный подход без шаблонов и протоколов",
      "Платформа доступна 24/7 на каждом этапе"
    ],
    cta: "Начать путь",
    tagline: "Мы ведём. Вы восстанавливаетесь. Вместе — к результату.",
    cabinetsTitle: "Кабинеты центра",
    whyTitle: "Почему с нами?",
    howTitle: "Как это работает",
    stepLabel: "Шаг за шагом",
    startLabel: "Начать",
    startTitle: "Готовы начать?",
    startText:
      "Зарегистрируйтесь и заполните анкету — это занимает около 10 минут.",
    disclaimerLabel: "Границы ответственности",
    disclaimerTitle: "Платформа не заменяет врача",
    disclaimerText:
      "Python Method не является медицинским учреждением, не ставит диагнозы, не назначает и не отменяет лечение. Сопровождение не заменяет наблюдение лечащего врача. Условия оказания услуг описаны в",
    disclaimerLink: "публичной оферте",
    quote: "«Исцеление — это не мгновение, это путь. Мы идём его вместе.»",
    cabinets: [
      { title: "Знакомство", text: "Узнайте о центре и наших принципах." },
      { title: "Вопросы и доверие", text: "Ответы на вопросы: оплата, условия, безопасность." },
      { title: "Профилактика", text: "Программы профилактики и поддержка." },
      { title: "Индивидуальный путь", text: "Глубокий разбор и персональная стратегия." },
      { title: "Формула", text: "Формула и инструкции по сопровождению." },
      { title: "Анализы", text: "Сбор, проверка и анализ ваших данных." },
      { title: "Дневник состояния", text: "Отслеживание изменений и динамики." },
      { title: "Материалы", text: "Рекомендации, образ жизни и поддержка." }
    ],
    why: [
      { title: "Индивидуальный подход", text: "Нет шаблонов. Только ваша уникальная стратегия." },
      { title: "Экспертное сопровождение", text: "Карен лично ведёт сложные случаи и корректирует путь." },
      { title: "Целостный подход", text: "Работаем с причиной, а не только с симптомами." },
      { title: "Поддержка на каждом этапе", text: "Вы не останетесь один — платформа и команда на связи." },
      { title: "Ваш результат — наша цель", text: "Мы идём вместе с вами к устойчивому состоянию." }
    ],
    steps: [
      { title: "1. Регистрация", text: "Создайте аккаунт с email и паролем. Один человек — один аккаунт и один непрерывный кейс." },
      { title: "2. Анкета", text: "Расскажите, для кого запрос, какая цель и что происходит сейчас. Анкета создаёт ваш кейс." },
      { title: "3. Документы", text: "Загрузите медицинские документы (выписки, заключения, анализы) в защищённое хранилище." },
      { title: "4. Изучение кейса", text: "Карен и команда изучают анкету и документы и связываются с вами по дальнейшим шагам." },
      { title: "5. Сопровождение", text: "После согласования вы выбираете тариф сопровождения (5 недель или 100 дней) и оплачиваете его." }
    ]
  },
  promo: {
    badge: "🎁 Акция для первых клиентов",
    titleFree: "Бесплатный разбор анализов от Карена",
    textFree:
      "Зарегистрируйтесь, заполните анкету и загрузите свои анализы — Карен лично изучит их и даст обратную связь по состоянию организма и рекомендации по восстановлению. Сейчас — бесплатно, для первых клиентов платформы.",
    titlePaid: "Разбор анализов от Карена",
    textPaid:
      "Личный разбор ваших анализов Кареном без полного сопровождения: обратная связь по состоянию организма, рекомендации и один день, чтобы задать Карену любые вопросы.",
    pricePaid: "$500 · разовая услуга",
    priceFree: "Бесплатно · позже эта услуга будет стоить $500",
    cta: "Получить разбор",
    ctaFree: "Получить бесплатный разбор",
    note: "Разбор является экспертным мнением и не заменяет консультацию врача."
  },
  widget: {
    toggleOpen: "☥ Спросить",
    toggleClose: "✕",
    header: "☥ Помощник центра",
    intro:
      "Здравствуйте! Я ИИ-помощник Python Method Center. Расскажу, как устроено сопровождение, и помогу сделать первый шаг. Помощник не даёт медицинских рекомендаций и не заменяет врача.",
    suggestions: [
      "Как проходит сопровождение?",
      "С чего мне начать?",
      "Какие документы нужно загрузить?"
    ],
    welcomeTitle:
      "☥ Привет! Добро пожаловать на платформу Python Method — «Реабилитация без границ».",
    welcomeText:
      "Я ИИ-помощник центра и рад вас приветствовать. Вы можете изучать сайт самостоятельно — или перейти в общение со мной, и я проведу вас, отвечая на все вопросы.",
    welcomeExplore: "Изучать сайт самостоятельно",
    welcomeChat: "Общаться со мной — проведу вас",
    welcomeNote: "Я всегда рядом — кнопка «☥ Спросить» внизу экрана.",
    send: "Отправить",
    sending: "Печатает…",
    placeholder: "Напишите сообщение…",
    listening: "Говорите — я записываю…",
    voiceHint:
      "🎤 Идёт запись — говорите. Нажмите микрофон ещё раз, чтобы остановить, затем «Отправить».",
    micStart: "Надиктовать голосом",
    micStop: "Остановить запись голоса",
    errorGeneric: "Не удалось получить ответ. Попробуйте ещё раз.",
    errorNetwork: "Нет связи с сервером. Проверьте интернет и попробуйте ещё раз."
  },
  payment: {
    eyebrow: "Оплата",
    title: "Тарифы сопровождения",
    description:
      "Оплата проходит через защищённую страницу Stripe. Платформа не хранит данные карт.",
    planLabel: "Тариф",
    payButton: "Перейти к оплате",
    unavailable: "Оплата по этому тарифу временно оформляется через команду",
    howLabel: "Как это работает",
    howTitle: "Оплата после согласования",
    howText:
      "Тариф выбирается после того, как команда изучит ваш кейс и согласует с вами план сопровождения. Если кнопка оплаты недоступна или вам нужен счёт — напишите команде через",
    howLink: "кабинет",
    offerLabel: "Условия",
    offerTitle: "Оферта",
    offerText:
      "Оплачивая тариф, вы подтверждаете принятие условий публичной оферты. Указывайте при оплате тот же email, что и в аккаунте платформы, — по нему команда привяжет платёж к вашему кейсу.",
    feeNote: "К каждому тарифу добавляется сервисный сбор 5%.",
    plan5Title: "Сопровождение — 5 недель",
    plan5Desc:
      "Разбор ситуации, план и сопровождение командой на 5 недель. В подарок Карен отправляет свою формулу — оплачивается только доставка.",
    plan5Price: "$1 200 + 5% сбор + $180 доставка формулы = $1 440",
    plan100Title: "Сопровождение — 100 дней",
    plan100Desc:
      "Расширенное сопровождение кейса командой Python Method на 100 дней.",
    plan100Price: "$3 500 + 5% сбор = $3 675"
  },
  paymentSuccess: {
    eyebrow: "Оплата получена",
    title: "Благодарим вас! ☥",
    description: "Ваш платёж успешно принят. Добро пожаловать в сопровождение Python Method.",
    whatNextLabel: "Что происходит дальше",
    steps: [
      "Мы привяжем оплату к вашему кейсу по email, указанному при оплате (используйте тот же email, что и в аккаунте).",
      "Команда подтвердит активацию сопровождения — вы получите сообщение в чате вашего кабинета.",
      "Если вы выбрали тариф «5 недель» — Карен лично отправит вам свою формулу в подарок. Доставка уже оплачена, трек-номер придёт в чат.",
      "Карен и команда изучат ваш кейс и начнут сопровождение. Всё общение — в вашем кабинете."
    ],
    cabinetCta: "Перейти в кабинет",
    questionLabel: "Есть вопрос?",
    questionTitle: "Мы на связи",
    questionText:
      "Если что-то пошло не так с оплатой или у вас есть вопрос — напишите нам в чате кабинета или через страницу поддержки, мы быстро разберёмся.",
    supportCta: "Написать в поддержку"
  },
  support: {
    eyebrow: "Поддержка",
    title: "Поддержка",
    description: "Вопросы по платформе, документам и оплате.",
    label: "Как связаться",
    cardTitle: "Напишите нам из кабинета",
    cardText1: "Форма «Написать команде» находится в",
    cabinetLink: "личном кабинете",
    cardText2: ". Команда ответит по контактам, указанным в вашей анкете."
  },
  login: {
    eyebrow: "Вход",
    title: "Вход и регистрация",
    description: "Войдите в аккаунт или создайте новый, используя email и пароль.",
    afterLabel: "Что дальше",
    afterTitle: "После входа",
    afterText:
      "Вы попадёте в личный кабинет, где можно заполнить анкету, создать кейс, загрузить медицинские документы и написать команде.",
    tabLogin: "Войти",
    tabSignup: "Создать аккаунт",
    email: "Email",
    password: "Пароль",
    submitLogin: "Войти",
    submitSignup: "Создать аккаунт",
    submitting: "Отправка..."
  }
};

const en: typeof ru = {
  nav: {
    "/": "Home",
    "/login": "Sign in",
    "/cabinet": "My account",
    "/payment": "Payment",
    "/support": "Support"
  },
  footer: {
    offer: "Public offer",
    support: "Support",
    team: "For the team",
    socials: "Social media"
  },
  landing: {
    eyebrow: "Digital rehabilitation center",
    title: "Python Method Center",
    subtitle: "Your personalized path to recovery, health and a new life.",
    points: [
      "Expert guidance under Karen's leadership",
      "An individual approach without templates or protocols",
      "The platform is with you 24/7 at every step"
    ],
    cta: "Start your journey",
    tagline: "We guide. You recover. Together — towards the result.",
    cabinetsTitle: "Center cabinets",
    whyTitle: "Why choose us?",
    howTitle: "How it works",
    stepLabel: "Step by step",
    startLabel: "Start",
    startTitle: "Ready to begin?",
    startText: "Create an account and fill in the questionnaire — it takes about 10 minutes.",
    disclaimerLabel: "Boundaries of responsibility",
    disclaimerTitle: "The platform does not replace your doctor",
    disclaimerText:
      "Python Method is not a medical institution; it does not diagnose, prescribe or discontinue treatment. The support program does not replace supervision by your physician. The terms of service are described in the",
    disclaimerLink: "public offer",
    quote: "“Healing is not a moment, it is a journey. We walk it together.”",
    cabinets: [
      { title: "Welcome", text: "Learn about the center and our principles." },
      { title: "Questions & trust", text: "Answers about payment, terms and safety." },
      { title: "Prevention", text: "Prevention programs and ongoing support." },
      { title: "Individual path", text: "In-depth review and a personal strategy." },
      { title: "Formula", text: "The formula and guidance for your program." },
      { title: "Analyses", text: "Collection, review and analysis of your data." },
      { title: "Health journal", text: "Tracking changes and progress." },
      { title: "Resources", text: "Recommendations, lifestyle and support." }
    ],
    why: [
      { title: "Individual approach", text: "No templates. Only your unique strategy." },
      { title: "Expert guidance", text: "Karen personally handles complex cases and adjusts the path." },
      { title: "Holistic approach", text: "We work with the root cause, not just the symptoms." },
      { title: "Support at every step", text: "You are never alone — the platform and the team stay in touch." },
      { title: "Your result is our goal", text: "We walk with you towards a stable condition." }
    ],
    steps: [
      { title: "1. Registration", text: "Create an account with email and password. One person — one account and one continuous case." },
      { title: "2. Questionnaire", text: "Tell us who the request is for, the goal, and what is happening now. The questionnaire creates your case." },
      { title: "3. Documents", text: "Upload medical documents (reports, conclusions, test results) to secure storage." },
      { title: "4. Case review", text: "Karen and the team study your questionnaire and documents and contact you about next steps." },
      { title: "5. Support program", text: "After agreement you choose a support plan (5 weeks or 100 days) and pay for it." }
    ]
  },
  promo: {
    badge: "🎁 Early clients offer",
    titleFree: "Free analyses review by Karen",
    textFree:
      "Create an account, fill in the questionnaire and upload your test results — Karen will personally review them and give you feedback on your condition and recovery recommendations. Free right now, for the platform's first clients.",
    titlePaid: "Analyses review by Karen",
    textPaid:
      "A personal review of your test results by Karen without the full support program: feedback on your condition, recommendations, and one day to ask Karen any questions.",
    pricePaid: "$500 · one-time service",
    priceFree: "Free · later this service will cost $500",
    cta: "Get the review",
    ctaFree: "Get the free review",
    note: "The review is an expert opinion and does not replace a doctor's consultation."
  },
  widget: {
    toggleOpen: "☥ Ask me",
    toggleClose: "✕",
    header: "☥ Center assistant",
    intro:
      "Hello! I am the AI assistant of Python Method Center. I can explain how the support program works and help you take the first step. I do not give medical advice and do not replace a doctor.",
    suggestions: [
      "How does the support program work?",
      "Where do I start?",
      "Which documents should I upload?"
    ],
    welcomeTitle:
      "☥ Hello! Welcome to the Python Method platform — “Rehabilitation Without Borders”.",
    welcomeText:
      "I am the center's AI assistant and I'm glad to greet you. You can explore the site on your own — or talk to me, and I will guide you and answer all your questions.",
    welcomeExplore: "Explore the site on my own",
    welcomeChat: "Talk to me — I'll guide you",
    welcomeNote: "I'm always nearby — the “☥ Ask me” button at the bottom of the screen.",
    send: "Send",
    sending: "Typing…",
    placeholder: "Write a message…",
    listening: "Speak — I'm listening…",
    voiceHint:
      "🎤 Recording — speak now. Tap the microphone again to stop, then press “Send”.",
    micStart: "Dictate by voice",
    micStop: "Stop voice recording",
    errorGeneric: "Could not get a reply. Please try again.",
    errorNetwork: "No connection to the server. Check your internet and try again."
  },
  payment: {
    eyebrow: "Payment",
    title: "Support plans",
    description:
      "Payment goes through a secure Stripe page. The platform does not store card data.",
    planLabel: "Plan",
    payButton: "Proceed to payment",
    unavailable: "Payment for this plan is temporarily arranged through the team",
    howLabel: "How it works",
    howTitle: "Payment after agreement",
    howText:
      "A plan is chosen after the team has studied your case and agreed on a support plan with you. If the payment button is unavailable or you need an invoice, write to the team via your",
    howLink: "account",
    offerLabel: "Terms",
    offerTitle: "Public offer",
    offerText:
      "By paying for a plan you confirm acceptance of the public offer. Use the same email as in your platform account — the team links the payment to your case by it.",
    feeNote: "A 5% service fee is added to each plan.",
    plan5Title: "Support — 5 weeks",
    plan5Desc:
      "Case review, plan and team support for 5 weeks. As a gift, Karen sends his formula — you only pay for delivery.",
    plan5Price: "$1,200 + 5% fee + $180 formula delivery = $1,440",
    plan100Title: "Support — 100 days",
    plan100Desc: "Extended case support by the Python Method team for 100 days.",
    plan100Price: "$3,500 + 5% fee = $3,675"
  },
  paymentSuccess: {
    eyebrow: "Payment received",
    title: "Thank you! ☥",
    description: "Your payment has been received. Welcome to the Python Method support program.",
    whatNextLabel: "What happens next",
    steps: [
      "We will link the payment to your case by the email used at checkout (use the same email as in your account).",
      "The team will confirm the activation of your support program — you will get a message in your account chat.",
      "If you chose the “5 weeks” plan — Karen will personally send you his formula as a gift. Delivery is already paid; the tracking number will arrive in the chat.",
      "Karen and the team will study your case and begin the support program. All communication happens in your account."
    ],
    cabinetCta: "Go to my account",
    questionLabel: "Have a question?",
    questionTitle: "We are here",
    questionText:
      "If something went wrong with the payment or you have a question — write to us in your account chat or via the support page, we will sort it out quickly.",
    supportCta: "Contact support"
  },
  support: {
    eyebrow: "Support",
    title: "Support",
    description: "Questions about the platform, documents and payment.",
    label: "How to reach us",
    cardTitle: "Write to us from your account",
    cardText1: "The “Write to the team” form is in your",
    cabinetLink: "personal account",
    cardText2: ". The team will reply using the contacts from your questionnaire."
  },
  login: {
    eyebrow: "Sign in",
    title: "Sign in & registration",
    description: "Sign in to your account or create a new one using email and password.",
    afterLabel: "What's next",
    afterTitle: "After signing in",
    afterText:
      "You will get to your personal account where you can fill in the questionnaire, create a case, upload medical documents and write to the team.",
    tabLogin: "Sign in",
    tabSignup: "Create account",
    email: "Email",
    password: "Password",
    submitLogin: "Sign in",
    submitSignup: "Create account",
    submitting: "Sending..."
  }
};

export type Dictionary = typeof ru;

export function getDictionary(locale: Locale): Dictionary {
  return locale === "en" ? en : ru;
}
