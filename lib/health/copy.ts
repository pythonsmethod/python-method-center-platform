import type { Locale } from "@/lib/i18n/locale";

// The questionnaire in both languages.
//
// It sits here rather than in the shared dictionary because it is one
// self-contained screen with a lot of words, and because the hints matter
// as much as the labels: a question a person does not understand is
// answered badly, and a badly answered questionnaire is worse than an empty
// one — it looks like information.

export const questionnaireCopy = {
  ru: {
    eyebrow: "Картина здоровья",
    title: "Расскажите о себе",
    intro:
      "Анализы не описывают человека. Цифры бывают в норме, когда человеку плохо, и вне нормы по причине, которой лаборатория не видит. Это та половина картины, которую не печатают на бланке.",
    note:
      "Заполнять всё сразу не нужно. Возвращайтесь и дополняйте её в любой момент: каждое сохранение остаётся в истории, поэтому видно не только как есть сейчас, но и что изменилось.",

    aboutTitle: "О вас",
    birthDate: "Дата рождения",
    birthDateHint: "Один и тот же показатель в 25 и в 75 лет читается по-разному.",
    sex: "Пол",
    sexFemale: "Женский",
    sexMale: "Мужской",
    sexUnspecified: "Предпочитаю не указывать",
    sexPlaceholder: "Выберите",
    height: "Рост, см",
    weight: "Вес, кг",
    measurementsHint: "Если точно не знаете — напишите примерно.",

    complaintsTitle: "Что вас беспокоит",
    complaints: "Жалобы на здоровье",
    complaintsHint:
      "Своими словами: что беспокоит, как давно, когда сильнее, когда легче. Если жалоб нет — так и напишите.",
    complaintsPlaceholder:
      "Например: с весны быстро устаю к середине дня, часто мёрзну, тяжело просыпаться…",

    historyTitle: "История здоровья",
    chronic: "Хронические заболевания и поставленные диагнозы",
    chronicHint: "Что и когда поставили, если помните.",
    surgeries: "Перенесённые операции",
    surgeriesHint: "Что и в каком году.",
    allergies: "Аллергия",
    allergiesHint: "На что и как проявляется — включая реакции на лекарства.",
    habits: "Вредные привычки",
    habitsHint: "Курение, алкоголь — честно и без оценки: это влияет на показатели.",

    womenTitle: "Женское здоровье",
    womenNote: "Эти вопросы задаются только женщинам и меняют чтение анализов.",
    pregnancy: "Беременность и кормление",
    pregnancyNo: "Нет",
    pregnancyPregnant: "Беременность",
    pregnancyBreastfeeding: "Кормление грудью",
    pregnancyPlanning: "Планирую беременность",
    cycle: "Цикл",
    cycleRegular: "Регулярный",
    cycleIrregular: "Нерегулярный",
    cycleAbsent: "Отсутствует",
    cycleMenopause: "Менопауза",
    cycleNote: "Что важно добавить о цикле",
    cycleNoteHint: "День цикла на момент сдачи анализов, задержки, особенности.",

    ownTitle: "Ваша картина целиком",
    own: "Опишите всё своими словами",
    ownHint:
      "Самое важное поле здесь. Стандартные вопросы подходят не всем, и то, что действительно имеет значение, часто не помещается ни в одну графу. Напишите так, как рассказали бы человеку: с чего началось, что менялось, что уже пробовали, что вас тревожит.",
    ownPlaceholder:
      "Пишите свободно и столько, сколько нужно. Это читают вместе с анализами.",

    submit: "Сохранить",
    submitting: "Сохраняем…",
    requiredMark: "обязательно",

    versionsTitle: "История изменений",
    versionsIntro:
      "Прежние версии сохраняются целиком и не переписываются. Так видно, что появилось, а что ушло.",
    versionsEmpty: "Пока это единственная версия.",
    savedOn: "Сохранено",
    currentVersion: "Текущая версия",
    emptyField: "не заполнено",
    unavailable:
      "Раздел сейчас недоступен. Попробуйте обновить страницу чуть позже.",
    notFilled: "Картина здоровья ещё не заполнена",
    yearsShort: "лет"
  },
  en: {
    eyebrow: "Health picture",
    title: "Tell us about yourself",
    intro:
      "Test results do not describe a person. Numbers can sit inside every reference interval while someone feels awful, and outside one for a reason the laboratory cannot see. This is the half of the picture that never gets printed on the form.",
    note:
      "There is no need to fill it all in at once. Come back and add to it whenever you like: every save is kept, so what changed is as visible as how things are now.",

    aboutTitle: "About you",
    birthDate: "Date of birth",
    birthDateHint: "The same result reads differently at 25 and at 75.",
    sex: "Sex",
    sexFemale: "Female",
    sexMale: "Male",
    sexUnspecified: "Prefer not to say",
    sexPlaceholder: "Choose",
    height: "Height, cm",
    weight: "Weight, kg",
    measurementsHint: "An approximate figure is fine if you are not sure.",

    complaintsTitle: "What is troubling you",
    complaints: "Health complaints",
    complaintsHint:
      "In your own words: what troubles you, for how long, when it is worse and when it eases. If nothing does, write that.",
    complaintsPlaceholder:
      "For example: since spring I run out of energy by midday, I feel cold constantly, mornings are hard…",

    historyTitle: "Health history",
    chronic: "Chronic conditions and diagnoses",
    chronicHint: "What was diagnosed, and when, as far as you remember.",
    surgeries: "Past operations",
    surgeriesHint: "What, and in which year.",
    allergies: "Allergies",
    allergiesHint: "To what and how it shows — including reactions to medicines.",
    habits: "Smoking and alcohol",
    habitsHint: "Honestly and without judgement: it changes how results read.",

    womenTitle: "Women's health",
    womenNote: "Asked of women only, and it changes how results are read.",
    pregnancy: "Pregnancy and breastfeeding",
    pregnancyNo: "No",
    pregnancyPregnant: "Pregnant",
    pregnancyBreastfeeding: "Breastfeeding",
    pregnancyPlanning: "Planning a pregnancy",
    cycle: "Cycle",
    cycleRegular: "Regular",
    cycleIrregular: "Irregular",
    cycleAbsent: "Absent",
    cycleMenopause: "Menopause",
    cycleNote: "Anything worth adding about your cycle",
    cycleNoteHint: "The day of the cycle when tests were taken, delays, anything unusual.",

    ownTitle: "Your whole picture",
    own: "Describe everything in your own words",
    ownHint:
      "The most important field here. A standard form does not fit everybody, and what actually matters often fits into none of the boxes. Write it as you would tell a person: how it began, what changed, what you have already tried, what worries you.",
    ownPlaceholder:
      "Write freely, and at whatever length you need. This is read alongside your results.",

    submit: "Save",
    submitting: "Saving…",
    requiredMark: "required",

    versionsTitle: "Change history",
    versionsIntro:
      "Earlier versions are kept whole and never rewritten, so what appeared and what went away are both visible.",
    versionsEmpty: "This is the only version so far.",
    savedOn: "Saved",
    currentVersion: "Current version",
    emptyField: "not filled in",
    unavailable:
      "The section is unavailable right now. Please refresh the page in a little while.",
    notFilled: "The health picture is not filled in yet",
    yearsShort: "years"
  }
} as const satisfies Record<Locale, object>;

// Widened to plain strings on purpose: `as const` above gives each Russian
// phrase its own literal type, and without this the English half is not
// assignable to the same shape.
export type QuestionnaireCopy = Record<
  keyof (typeof questionnaireCopy)["ru"],
  string
>;
