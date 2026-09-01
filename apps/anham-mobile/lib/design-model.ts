export type DesignLocale = "ru" | "en";
export const designTabs = ["vitamins", "analyses", "anham", "plan", "professor"] as const;
export type DesignTab = (typeof designTabs)[number];

export function isDesignTab(value: unknown): value is DesignTab {
  return typeof value === "string" && designTabs.some((tab) => tab === value);
}

export function designHref(tab: DesignTab, locale: DesignLocale, gallery = false) {
  void gallery;
  return `/?tab=${tab}&lang=${locale}`;
}

export const designCopy = {
  ru: {
    preview: "Макет · демоданные", all: "Все пять экранов", one: "Один экран",
    previewNote: "Предпросмотр для согласования. Данные вымышлены, изменения не сохраняются. Сообщения, файлы и уведомления не отправляются.",
    nav: "Разделы приложения", language: "Язык интерфейса", settings: "Настройки", close: "Закрыть",
    tabs: { vitamins: "Витамины", analyses: "Анализы", anham: "Anham", plan: "План", professor: "Professor" },
    titles: { vitamins: "Мои витамины", analyses: "Мои анализы", anham: "Anham", plan: "Мой план", professor: "Professor Python" },
    subtitles: { vitamins: "Расписание и приём", analyses: "Моя динамика", anham: "Ваш ИИ-проводник", plan: "Рекомендации Professor Python", professor: "Защищённый диалог" },
    today: "Сегодня", taken: "принято", of: "из", vitaminD: "Витамин D", omega: "Омега-3", magnesium: "Магний",
    capsule: "1 капсула", breakfast: "после завтрака", lunch: "после еды", evening: "вечером",
    addVitamin: "Добавить витамин", history: "История приёма", reminders: "Напоминания", on: "включены", off: "выключены",
    recommendation: "Рекомендации — Professor Python", name: "Название", time: "Время приёма", save: "Добавить", cancel: "Отмена",
    markTaken: "Отметить приём", undoTaken: "Отменить отметку", historyEmpty: "Приёмы пока не отмечены.",
    upload: "Загрузить бланк", manual: "Внести вручную", ferritin: "Ферритин", vitaminDUnit: "нг/мл", ferritinUnit: "нг/мл",
    results: "результата", may: "12 мая", july: "10 июля", august: "12 августа", chart: "Динамика показателя",
    explain: "Могу объяснить термин", assessment: "Оценку даёт Professor Python", value: "Значение", unit: "Единица измерения", date: "Дата анализа",
    fileNote: "Бланк выбран только для демонстрации. Он не загружен и не обработан.", invalid: "Укажите название, дату и положительное числовое значение.",
    planDate: "Обновлено 12 августа", task1: "Загрузить ферритин до пятницы", task2: "Прочитать новую рекомендацию", task3: "Подготовить вопрос профессору",
    discuss: "Обсудить с Anham", progress: "Выполнено пунктов плана", complete: "Отметить выполненным", undo: "Вернуть в план",
    discussReply: "Обсудить ответ с Anham",
    greeting: "Доброе утро, Аня. Я рядом. О чём хотите поговорить?",
    userMessage: "Хочу спокойно начать день и ничего не забыть.",
    assistantMessage: "Давайте без спешки. Можем обсудить ваш день или то, что сейчас волнует. Я слушаю.",
    professor1: "Я получил ваши анализы и внимательно их изучаю. Когда завершу разбор, напишу вам здесь.",
    client1: "Спасибо. Нужно ли сейчас что-то менять в приёме витаминов?",
    professor2: "Пока следуйте согласованному плану. Если потребуется изменение, мы обсудим его отдельно.",
    write: "Напишите Anham…", writeProfessor: "Сообщение Professor Python…", send: "Отправить сообщение", attachment: "Прикрепить файл",
    voice: "Голосовой диалог", microphone: "Голосовое сообщение", demoVoice: "Здесь будет голосовой диалог с Anham. В этом макете микрофон не включается и запись не ведётся.",
    demoSent: "Показано только в макете. Сообщение не отправлено.", fileSelected: "Выбран файл", received: "Ответ собеседника", sent: "Ваше сообщение", demonstration: "Пример диалога",
    localOnly: "Изменение действует только в этом предпросмотре.", profileNote: "Оформление профиля — предпросмотр. Аккаунт и его настройки не изменяются.",
    demoProfessorVoice: "Здесь будет запись голосового сообщения для Professor Python. В макете микрофон не включается и ничего не отправляется.",
    invalidVitamin: "Укажите название витамина и время приёма.",
  },
  en: {
    preview: "Design preview · sample data", all: "All five screens", one: "Single screen",
    previewNote: "Preview for approval. All data is fictional and changes are not saved. Messages, files and notifications are not sent.",
    nav: "App sections", language: "Interface language", settings: "Settings", close: "Close",
    tabs: { vitamins: "Vitamins", analyses: "Lab results", anham: "Anham", plan: "Plan", professor: "Professor" },
    titles: { vitamins: "My vitamins", analyses: "My lab results", anham: "Anham", plan: "My plan", professor: "Professor Python" },
    subtitles: { vitamins: "Schedule & intake", analyses: "My trends", anham: "Your AI companion", plan: "Guidance from Professor Python", professor: "Private dialogue" },
    today: "Today", taken: "taken", of: "of", vitaminD: "Vitamin D", omega: "Omega-3", magnesium: "Magnesium",
    capsule: "1 capsule", breakfast: "after breakfast", lunch: "after a meal", evening: "in the evening",
    addVitamin: "Add vitamin", history: "Intake history", reminders: "Reminders", on: "on", off: "off",
    recommendation: "Guidance — Professor Python", name: "Name", time: "Intake time", save: "Add", cancel: "Cancel",
    markTaken: "Mark as taken", undoTaken: "Undo intake", historyEmpty: "No intake has been marked yet.",
    upload: "Upload report", manual: "Enter manually", ferritin: "Ferritin", vitaminDUnit: "ng/mL", ferritinUnit: "ng/mL",
    results: "results", may: "May 12", july: "Jul 10", august: "Aug 12", chart: "Lab result trend",
    explain: "I can explain a term", assessment: "Assessed by Professor Python", value: "Value", unit: "Unit", date: "Test date",
    fileNote: "This report is selected for demonstration only. It has not been uploaded or processed.", invalid: "Enter a name, date and a positive numeric value.",
    planDate: "Updated August 12", task1: "Upload ferritin results by Friday", task2: "Read the new recommendation", task3: "Prepare a question for the professor",
    discuss: "Discuss with Anham", progress: "Plan items completed", complete: "Mark complete", undo: "Mark incomplete",
    discussReply: "Discuss the reply with Anham",
    greeting: "Good morning, Anna. I’m here. What would you like to talk about?",
    userMessage: "I want a calm start to the day without forgetting anything.",
    assistantMessage: "Let’s take it slowly. We can talk about your day or whatever is on your mind. I’m listening.",
    professor1: "I have received your lab results and am reviewing them carefully. I will write to you here when the review is ready.",
    client1: "Thank you. Should I change anything about my vitamins now?",
    professor2: "For now, follow the agreed plan. If a change is needed, we will discuss it separately.",
    write: "Message Anham…", writeProfessor: "Message Professor Python…", send: "Send message", attachment: "Attach file",
    voice: "Voice conversation", microphone: "Voice message", demoVoice: "This is where you will talk to Anham by voice. In this preview, the microphone stays off and no audio is recorded.",
    demoSent: "Shown in the preview only. This message was not sent.", fileSelected: "Selected file", received: "Incoming message", sent: "Your message", demonstration: "Sample conversation",
    localOnly: "This change applies only to this preview.", profileNote: "Profile design preview. Your account and settings are unchanged.",
    demoProfessorVoice: "This is where you will record a voice message for Professor Python. In this preview, the microphone stays off and nothing is sent.",
    invalidVitamin: "Enter a vitamin name and intake time.",
  },
};

export type DesignCopy = typeof designCopy["ru"];

export function formatDesignValue(value: number, locale: DesignLocale) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", { maximumFractionDigits: 2 }).format(value);
}

export function parseDesignValue(value: string): number | null {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function designResultCount(count: number, locale: DesignLocale) {
  if (locale === "en") return `${count} ${count === 1 ? "result" : "results"}`;
  const rule = new Intl.PluralRules("ru").select(count);
  return `${count} ${rule === "one" ? "результат" : rule === "few" ? "результата" : "результатов"}`;
}

export function designChartMax(values: number[]) {
  const targetStep = Math.max(...values, 1) * 1.2 / 3;
  const magnitude = 10 ** Math.floor(Math.log10(targetStep));
  return Math.ceil(targetStep / magnitude) * magnitude * 3;
}
