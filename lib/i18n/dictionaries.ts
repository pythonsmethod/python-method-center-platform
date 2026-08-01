import type { Locale } from "@/lib/i18n/locale";

// Public-site copy in both languages. The client cabinet and the admin
// workspace stay Russian for now (team-facing).

const ru = {
  nav: {
    "/": "Главная",
    "/shop": "Магазин",
    "/login": "Вход",
    "/cabinet": "Кабинет",
    "/payment": "Сопровождение",
    "/support": "Поддержка"
  } as Record<string, string>,
  footer: {
    offer: "Публичная оферта",
    support: "Поддержка",
    team: "Для команды",
    socials: "Социальные сети",
    disclaimer:
      "Платформа не является медицинским учреждением и не заменяет наблюдение лечащего врача. При экстренных состояниях обращайтесь в местную службу экстренной помощи (112 / 911)."
  },
  landing: {
    eyebrow: "Цифровой центр восстановления",
    title: "Python Method Center",
    subtitle: "Реабилитация без границ",
    expertLabel: "Эксперт центра",
    expertTitle: "Экспертное сопровождение под руководством Professor Python",
    expertText:
      "Каждый кейс он смотрит лично: ваши анализы, вашу историю, ваш путь. Без шаблонов и протоколов.",
    aiLabel: "Искусственный интеллект центра",
    aiTitle: "ИИ рядом с вами 24/7 — на каждом шаге пути",
    aiText:
      "Это не просто сайт центра. Здесь работает искусственный интеллект, который растёт вместе с вами: сначала отвечает на вопросы, потом ведёт по кабинету, а после начала сопровождения — работает уже с вашим случаем.",
    aiLevels: [
      {
        title: "Знакомство",
        text: "Спросите что угодно о центре и методе — прямо сейчас, без регистрации."
      },
      {
        title: "Личный помощник",
        text: "После регистрации ИИ видит ваш путь и ведёт шаг за шагом."
      },
      {
        title: "Персональный ИИ",
        text: "После начала сопровождения работает с вашим случаем и вашими материалами."
      }
    ],
    cta: "Начать путь",
    tagline: "Мы ведём. Вы восстанавливаетесь. Вместе — к результату.",
    cabinetsTitle: "Кабинеты центра",
    whyTitle: "Почему с нами?",
    howTitle: "Как работает центр",
    stepLabel: "Шаг за шагом",
    stepsLead: "Сами шаги одни и те же — вот они:",
    pathsOr: "или",
    pathAiMark: "☥",
    pathAiTitle: "С ИИ-помощником",
    pathAiText:
      "Он проведёт через каждый шаг, ответит на вопросы и подскажет, чего не хватает.",
    pathSelfMark: "✦",
    pathSelfTitle: "Самостоятельно",
    pathSelfText:
      "Пройдите весь путь сами, в своём темпе. Помощник останется в стороне, пока не понадобится.",
    aiStepLabel: "С вами на каждом шаге",
    aiStepTitle: "ИИ-помощник центра",
    aiStepText:
      "Задайте вопрос ещё до регистрации. Дальше помощник проведёт через регистрацию, анкету и документы и останется рядом на всём сопровождении.",
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
      { title: "Экспертное сопровождение", text: "Professor Python лично ведёт сложные случаи и корректирует путь." },
      { title: "Целостный подход", text: "Работаем с причиной, а не только с симптомами." },
      { title: "Поддержка на каждом этапе", text: "Вы не останетесь один — платформа и команда на связи." },
      { title: "Ваш результат — наша цель", text: "Мы идём вместе с вами к устойчивому состоянию." }
    ],
    steps: [
      { title: "Регистрация", text: "Создайте аккаунт." },
      { title: "Анкета", text: "Заполните данные о себе." },
      { title: "Документы", text: "Загрузите медицинские документы." },
      { title: "Тариф", text: "Выберите тариф сопровождения." },
      {
        title: "Разбор и сопровождение",
        text: "После выбранного тарифа вы получаете разбор кейса и начинаете сопровождение."
      }
    ]
  },
  promo: {
    badge: "🎁 Акция для первых клиентов",
    titleFree: "Бесплатный разбор анализов от Professor Python",
    textFree:
      "Зарегистрируйтесь, заполните анкету и загрузите свои анализы — Professor Python лично изучит их и даст обратную связь по состоянию организма и рекомендации по восстановлению. Сейчас — бесплатно, для первых клиентов платформы.",
    titlePaid: "Разбор анализов от Professor Python",
    textPaid:
      "Личный разбор ваших анализов от Professor Python без полного сопровождения: обратная связь по состоянию организма, рекомендации и один день, чтобы задать любые вопросы.",
    // The amount is rendered on its own line and never wraps mid-number.
    pricePaid: "Разовая услуга — стоимость",
    priceFree: "Бесплатно · позже эта услуга будет стоить",
    priceAmount: "$1 000",
    cta: "Получить разбор",
    ctaFree: "Получить бесплатный разбор",
    note: "Разбор является экспертным мнением и не заменяет консультацию врача."
  },
  paymentTest: {
    eyebrow: "Тестовый доступ",
    title: "Пробная оплата — 3 $",
    description:
      "Эта страница только для приглашённых тестировщиков. Оплата в 3 $ открывает тот же путь, что и настоящий тариф: оплата, кабинет, персональный ИИ по вашему случаю. Это не тариф сопровождения и не разбор от Professor Python.",
    planTitle: "Тестовый доступ на 14 дней",
    planDesc:
      "Полный доступ к платной части платформы для проверки: кабинет, загрузка документов, чат с командой и персональный ИИ. Сопровождение Professor Python в эту оплату не входит.",
    planPrice: "Пробная оплата — 3 $",
    howLabel: "Что проверить",
    howTitle: "О чём нам написать",
    howText:
      "Пройдите путь как обычный человек: регистрация, анкета, загрузка документа, оплата, кабинет, общение с ИИ. Напишите нам, что было непонятно, что не открылось и где вы растерялись — именно это нам и нужно.",
    noticeLabel: "Честно о деньгах",
    noticeTitle: "3 $ — это проверка оплаты, а не услуга",
    noticeText:
      "Сумма нужна только для того, чтобы проверить приём платежей в вашей стране. Никаких обязательств у вас не возникает, доступ закроется через 14 дней. Если оплата не пройдёт — напишите нам, это тоже ценный результат теста.",
    unavailable: "Тестовая оплата сейчас отключена"
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
      "Что умеет ваш ИИ?"
    ],
    // Level 2 and 3 of the assistant: the same window, but a different
    // helper — personal after sign-up, case-aware after payment.
    tiers: {
      registered: {
        header: "☥ Ваш личный помощник",
        intro:
          "Здравствуйте! Я ваш личный помощник в кабинете. Вижу, на каком шаге вы сейчас, подскажу, чего не хватает и что будет дальше. Медицинские вопросы — к Professor Python, он отвечает лично.",
        suggestions: [
          "Что мне сделать дальше?",
          "На каком этапе мой кейс?",
          "Какие документы ещё нужны?"
        ]
      },
      client: {
        header: "☥ Ваш персональный ИИ",
        intro:
          "Здравствуйте! Я ваш персональный ИИ и веду ваш кейс: помню вашу историю, ваши документы и сроки сопровождения. Помогу разобраться в материалах и подготовить вопрос — решения по состоянию принимает Professor Python лично.",
        suggestions: [
          "Что сейчас происходит с моим кейсом?",
          "Помоги сформулировать вопрос для Professor Python",
          "Сколько ещё длится моё сопровождение?"
        ]
      }
    },
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
    offerCheckboxPrefix: "Я ознакомился(лась) и принимаю условия ",
    offerCheckboxLink: "публичной оферты",
    offerHint:
      "Чтобы перейти к оплате, отметьте согласие с условиями публичной оферты.",
    feeNote: "К каждому тарифу добавляется сервисный сбор 5%.",
    plan5Title: "Сопровождение — 5 недель",
    plan5Desc:
      "Разбор ситуации, план и сопровождение командой на 5 недель. В подарок Professor Python отправляет свою формулу — 200 капсул; вы оплачиваете только доставку ($180).",
    plan5Price: "$1 200 + 5% сбор + $180 доставка формулы = $1 440",
    plan100Title: "Сопровождение — 100 дней",
    plan100Desc:
      "Расширенное сопровождение кейса командой Python Method на 100 дней. В подарок Professor Python отправляет свою формулу — 600 капсул, и доставку Professor Python берёт на себя.",
    plan100Price: "$3 500 + 5% сбор = $3 675"
  },
  paymentSuccess: {
    eyebrow: "Оплата получена",
    title: "Благодарим вас! ☥",
    description: "Ваш платёж успешно принят. Добро пожаловать в сопровождение Python Method.",
    whatNextLabel: "Что происходит дальше",
    steps: [
      "Оплата привязывается к вашему кейсу автоматически в течение нескольких минут (по аккаунту или email, указанному при оплате). Если через 10 минут её не видно в кабинете — напишите нам.",
      "Команда подтвердит активацию сопровождения — вы получите сообщение в чате вашего кабинета.",
      "Professor Python лично отправит вам свою формулу в подарок (200 капсул на тарифе «5 недель», 600 капсул на тарифе «100 дней»). На тарифе «5 недель» доставка уже оплачена вами, на «100 дней» доставку Professor Python берёт на себя. Трек-номер придёт в чат.",
      "Professor Python и команда изучат ваш кейс и начнут сопровождение. Всё общение — в вашем кабинете."
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
    description:
      "Вопросы по платформе, входу, документам и оплате. Отвечаем в течение 24 часов (в рабочие дни).",
    label: "Как связаться",
    cardTitle: "Напишите нам из кабинета",
    cardText1: "Форма «Написать команде» находится в",
    cabinetLink: "личном кабинете",
    cardText2: ". Команда ответит по контактам, указанным в вашей анкете.",
    emergencyLabel: "Экстренные ситуации",
    emergencyTitle: "Платформа не оказывает экстренную помощь",
    emergencyText:
      "При угрозе жизни, резком ухудшении состояния или мыслях о причинении себе вреда немедленно звоните в местную службу экстренной помощи (112 в Европе, 911 в США) или обратитесь в ближайшую больницу. Не ждите ответа команды через платформу.",
    guestLabel: "Нет аккаунта или не получается войти?",
    guestTitle: "Напишите нам прямо здесь",
    guestText:
      "Форма ниже работает без входа в аккаунт. Ответим на указанный email в течение 24 часов (в рабочие дни).",
    formEmail: "Email для ответа",
    formCategory: "Тема обращения",
    catLogin: "Не получается войти в аккаунт",
    catPayment: "Вопрос по оплате",
    catTechnical: "Техническая проблема",
    catOther: "Другой вопрос",
    formMessage: "Опишите вопрос",
    formConsent:
      "Соглашаюсь на обработку указанного email для ответа на моё обращение",
    formSubmit: "Отправить сообщение",
    formSubmitting: "Отправляю…",
    helpLabel: "Частые ситуации",
    helpLoginTitle: "Забыли пароль?",
    helpLoginText: "Восстановите доступ за пару минут:",
    helpLoginCta: "Восстановить пароль",
    helpPaymentTitle: "Оплатили, но оплата не видна?",
    helpPaymentText:
      "Оплата появляется в кабинете автоматически в течение нескольких минут. Если её нет через 10 минут — напишите через форму, выбрав тему «Вопрос по оплате», и укажите email, с которым платили.",
    loginCta: "Войти в аккаунт"
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
    submitting: "Отправка...",
    forgot: "Забыли пароль?",
    linkInvalid:
      "Ссылка из письма недействительна или устарела. Войдите с паролем или запросите новую ссылку через «Забыли пароль?»."
  }
};

const en: typeof ru = {
  nav: {
    "/": "Home",
    "/shop": "Shop",
    "/login": "Sign in",
    "/cabinet": "My account",
    "/payment": "Support",
    "/support": "Support"
  },
  footer: {
    offer: "Public offer",
    support: "Support",
    team: "For the team",
    socials: "Social media",
    disclaimer:
      "The platform is not a medical institution and does not replace your doctor's care. In an emergency, call your local emergency service (112 / 911)."
  },
  landing: {
    eyebrow: "Digital recovery center",
    title: "Python Method Center",
    subtitle: "Rehabilitation without borders",
    expertLabel: "The center's expert",
    expertTitle: "Expert support led by Professor Python",
    expertText:
      "He looks at every case himself: your tests, your history, your path. No templates, no protocols.",
    aiLabel: "The center's artificial intelligence",
    aiTitle: "AI beside you 24/7 — at every step of the way",
    aiText:
      "This is not just a center's website. An artificial intelligence works here and grows with you: first it answers questions, then it guides you through your cabinet, and once your support begins it works with your own case.",
    aiLevels: [
      {
        title: "First contact",
        text: "Ask anything about the center and the method — right now, no sign-up."
      },
      {
        title: "Personal assistant",
        text: "After sign-up the AI sees your journey and guides you step by step."
      },
      {
        title: "Personal AI",
        text: "Once support begins it works with your case and your materials."
      }
    ],
    cta: "Start your journey",
    tagline: "We guide. You recover. Together — towards the result.",
    cabinetsTitle: "Center cabinets",
    whyTitle: "Why choose us?",
    howTitle: "How the center works",
    stepLabel: "Step by step",
    stepsLead: "The steps themselves are the same — here they are:",
    pathsOr: "or",
    pathAiMark: "☥",
    pathAiTitle: "With the AI assistant",
    pathAiText:
      "It walks you through every step, answers questions and tells you what is missing.",
    pathSelfMark: "✦",
    pathSelfTitle: "On your own",
    pathSelfText:
      "Take the whole path yourself, at your own pace. The assistant stays aside until you need it.",
    aiStepLabel: "With you at every step",
    aiStepTitle: "The center's AI assistant",
    aiStepText:
      "Ask a question before you even sign up. From there the assistant guides you through registration, the questionnaire and documents, and stays with you for the whole support program.",
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
      { title: "Registration", text: "Create an account." },
      { title: "Questionnaire", text: "Fill in your details." },
      { title: "Documents", text: "Upload your medical documents." },
      { title: "Plan", text: "Choose a support plan." },
      {
        title: "Review and support",
        text: "Once your plan is chosen you receive the case review and the support program begins."
      }
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
    pricePaid: "One-time service — price",
    priceFree: "Free · later this service will cost",
    priceAmount: "$1,000",
    cta: "Get the review",
    ctaFree: "Get the free review",
    note: "The review is an expert opinion and does not replace a doctor's consultation."
  },
  paymentTest: {
    eyebrow: "Test access",
    title: "Test payment — $3",
    description:
      "This page is for invited testers only. A $3 payment opens the same path as a real plan: checkout, the cabinet, the personal AI for your case. It is not a support plan and not a review by Professor Python.",
    planTitle: "Test access for 14 days",
    planDesc:
      "Full access to the paid part of the platform for testing: the cabinet, document upload, the chat with the team and the personal AI. Support by Professor Python is not included.",
    planPrice: "Test payment — $3",
    howLabel: "What to check",
    howTitle: "What to tell us",
    howText:
      "Walk the path as an ordinary person would: sign-up, questionnaire, document upload, payment, cabinet, talking to the AI. Tell us what was unclear, what did not open and where you got lost — that is exactly what we need.",
    noticeLabel: "Honest about the money",
    noticeTitle: "$3 is a payment check, not a service",
    noticeText:
      "The amount exists only to verify that payments work in your country. It creates no obligations for you, and access closes after 14 days. If the payment fails — tell us, that is a valuable test result too.",
    unavailable: "Test payment is currently switched off"
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
      "What can your AI do?"
    ],
    tiers: {
      registered: {
        header: "☥ Your personal assistant",
        intro:
          "Hello! I am your personal assistant inside the cabinet. I can see where you are right now, what is missing and what comes next. Medical questions go to Professor Python — he answers personally.",
        suggestions: [
          "What should I do next?",
          "What stage is my case at?",
          "Which documents are still missing?"
        ]
      },
      client: {
        header: "☥ Your personal AI",
        intro:
          "Hello! I am your personal AI and I follow your case: your history, your documents and your support period. I can help you navigate your materials and prepare a question — decisions about your condition are made by Professor Python personally.",
        suggestions: [
          "What is happening with my case now?",
          "Help me formulate a question for Professor Python",
          "How long does my support period still run?"
        ]
      }
    },
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
    offerCheckboxPrefix: "I have read and accept the terms of the ",
    offerCheckboxLink: "public offer",
    offerHint:
      "To proceed to payment, please confirm your agreement with the public offer.",
    feeNote: "A 5% service fee is added to each plan.",
    plan5Title: "Support — 5 weeks",
    plan5Desc:
      "Case review, plan and team support for 5 weeks. As a gift, Karen sends his formula — 200 capsules; you only pay for delivery ($180).",
    plan5Price: "$1,200 + 5% fee + $180 formula delivery = $1,440",
    plan100Title: "Support — 100 days",
    plan100Desc:
      "Extended case support by the Python Method team for 100 days. As a gift, Karen sends his formula — 600 capsules, with delivery at Karen's own expense.",
    plan100Price: "$3,500 + 5% fee = $3,675"
  },
  paymentSuccess: {
    eyebrow: "Payment received",
    title: "Thank you! ☥",
    description: "Your payment has been received. Welcome to the Python Method support program.",
    whatNextLabel: "What happens next",
    steps: [
      "The payment is linked to your case automatically within a few minutes (by your account or the email used at checkout). If you don't see it in your account after 10 minutes — write to us.",
      "The team will confirm the activation of your support program — you will get a message in your account chat.",
      "Karen will personally send you his formula as a gift (200 capsules on the “5 weeks” plan, 600 capsules on the “100 days” plan). On the “5 weeks” plan the delivery is already paid by you, on the “100 days” plan Karen covers the delivery himself. The tracking number will arrive in the chat.",
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
    description:
      "Questions about the platform, sign-in, documents and payment. We reply within 24 hours (on business days).",
    label: "How to reach us",
    cardTitle: "Write to us from your account",
    cardText1: "The “Write to the team” form is in your",
    cabinetLink: "personal account",
    cardText2: ". The team will reply using the contacts from your questionnaire.",
    emergencyLabel: "Emergencies",
    emergencyTitle: "The platform does not provide emergency care",
    emergencyText:
      "If there is a threat to life, a sharp deterioration, or thoughts of self-harm, immediately call your local emergency service (112 in Europe, 911 in the USA) or go to the nearest hospital. Do not wait for the team to reply through the platform.",
    guestLabel: "No account, or can't sign in?",
    guestTitle: "Write to us right here",
    guestText:
      "The form below works without signing in. We will reply to the email you provide within 24 hours (on business days).",
    formEmail: "Email for our reply",
    formCategory: "Topic",
    catLogin: "Can't sign in to my account",
    catPayment: "Payment question",
    catTechnical: "Technical problem",
    catOther: "Other question",
    formMessage: "Describe your question",
    formConsent:
      "I agree to the processing of this email address for the purpose of replying to my request",
    formSubmit: "Send message",
    formSubmitting: "Sending…",
    helpLabel: "Common situations",
    helpLoginTitle: "Forgot your password?",
    helpLoginText: "Restore access in a couple of minutes:",
    helpLoginCta: "Reset password",
    helpPaymentTitle: "Paid, but the payment isn't visible?",
    helpPaymentText:
      "Payments appear in your account automatically within a few minutes. If it's not there after 10 minutes — write via the form, choosing the “Payment question” topic, and mention the email you paid with.",
    loginCta: "Sign in"
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
    submitting: "Sending...",
    forgot: "Forgot your password?",
    linkInvalid:
      "The link from the email is invalid or expired. Sign in with your password or request a new link via “Forgot your password?”."
  }
};

export type Dictionary = typeof ru;

export function getDictionary(locale: Locale): Dictionary {
  return locale === "en" ? en : ru;
}
