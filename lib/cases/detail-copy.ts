import type { Locale } from "@/lib/i18n/locale";

// Every word on the staff Case detail page, in both languages.
//
// The page used to be Russian literals inline, with a handful of locale
// ternaries added later for the sections that were rewritten. An English
// reader therefore met a page that was half theirs: English headings above
// Russian labels, Russian empty states, Russian accessibility names. The
// rule in AGENTS.md is that visible copy, accessibility labels, validation,
// metadata, navigation and states all follow the active locale, so all of it
// lives here and the page reads one object.

export function caseDetailCopy(locale: Locale) {
  return locale === "ru"
    ? {
        eyebrow: "Рабочее место команды",
        untitledCase: "Кейс без названия",
        caseIdPrefix: "Кейс",
        setupTitle: "Кейс требует настройки Supabase Auth",
        setupDescription: "Для доступа требуется настроенная аутентификация.",
        accessErrorTitle: "Ошибка доступа",
        accessErrorHeading: "Кейс недоступен",
        accessErrorDescription: "Не удалось проверить доступ.",
        loadErrorLabel: "Кейс недоступен",
        loadErrorHeading: "Ошибка загрузки",
        loadErrorDescription: "Не удалось загрузить кейс.",
        title: "Кейс",

        clientLabel: "Клиент",
        clientUnnamed: "Без имени",
        email: "Email",
        phone: "Телефон",
        deliveryEmail: "Email для доставки",
        deliveryPhone: "Телефон для доставки",
        recipient: "Получатель",
        deliveryAddress: "Адрес для доставки",
        deliveryExtra: "Дополнительно",
        dash: "—",

        situationLabel: "Описание ситуации",
        situationHeading: "Из анкеты",
        situationEmpty: "Описание не заполнено.",

        conversationLabel: "Чат с клиентом",
        conversationHeading: "Переписка по кейсу",
        conversationHint:
          "Клиент видит эти сообщения в своём кабинете. Можно писать текстом или записывать голосовые.",
        conversationAria: "Чат с клиентом",

        paymentsLabel: "Оплаты",
        paymentsTitle: "Автоматические оплаты",
        paymentsDescription:
          "Здесь появляются только оплаты, автоматически подтверждённые платёжной системой.",
        paymentsEmpty: "Автоматически подтверждённых оплат пока нет.",
        paymentsAria: "Оплаты кейса",

        reviewAria: "Разбор анализов",

        documentsLabel: "Документы",
        documentsHeading: "История загрузок",
        documentsHint:
          "По загрузкам, от свежих к ранним. Повторная загрузка файла с тем же названием помечена как новая версия — это динамика клиента.",
        documentsEmpty: "Документы ещё не загружены.",
        documentsAria: "Документы кейса",
        documentFallbackName: "Документ",
        openFile: "Открыть файл",

        activityLabel: "История",
        activityHeading: "Что происходило по кейсу",
        activityHint:
          "Действия по кейсу, от свежих к ранним: анкета, оплаты, периоды сопровождения, обращения. Архивные записи классификации сохранены в аудите и здесь не показываются.",
        activityEmpty: "Действий пока нет.",
        activityAria: "История кейса",

        clientAssistantLabel: "Клиент и ИИ-помощник",
        clientAssistantHeading: "Переписка клиента с помощником",
        clientAssistantHint:
          "Здесь сохранены вопросы клиента, ответы и автоматические сообщения Анхама. Прочитайте переписку перед ответом.",
        clientAssistantEmpty: "В переписке пока нет сообщений.",
        clientAssistantAria: "Переписка клиента с ИИ-помощником",

        assistantLabel: "ИИ-Ассистент Professor Python",
        assistantHeading: "Помощник по этому кейсу",
        assistantAria: "ИИ-Ассистент по кейсу",
        assistantHint:
          "Ассистент видит снимок кейса из базы: анкету, список документов, оплаты и историю. Содержимое загруженных файлов ему недоступно — но его можно приложить прямо в чат скрепкой: до 30 фото или PDF за раз. Снимки сжимаются автоматически, а большой набор ассистент читает по частям и собирает общий разбор. Приложенное нигде не сохраняется.",
        assistantIntro:
          "Я вижу данные этого кейса: анкету, список документов, оплаты и историю. Спросите — сделаю выжимку, черновик ответа клиенту или предложу следующие шаги. Фото и PDF можно приложить скрепкой — до 30 штук за раз, прочитаю все. Решения — за Professor Python.",
        assistantPlaceholder: "Например: сделай выжимку кейса…",
        assistantSuggestions: [
          "Разбери приложенные анализы по методу",
          "Сделай выжимку кейса",
          "Чего не хватает в этом кейсе?",
          "Составь черновик ответа клиенту"
        ],

        submissionsAria: "Анкеты онбординга",
        submissionLabel: "Анкета",
        submissionMissingHeading: "Анкета не отправлена",
        submissionMissingText: "Клиент ещё не заполнил анкету онбординга.",
        submissionFrom: "Анкета от",
        submissionHeading: "Ответы клиента",

        backToCases: "← Ко всем кейсам",

        yes: "Да",
        no: "Нет",

        payloadFields: {
          full_name: "Полное имя",
          phone: "Телефон",
          care_recipient_type: "Для кого запрос",
          primary_goal: "Основная цель",
          situation_description: "Описание ситуации",
          offer_accepted: "Оферта принята",
          offer_version: "Версия оферты",
          consent_accepted: "Согласие на обработку данных",
          submitted_at: "Отправлена"
        } as Record<string, string>,
        careRecipients: {
          self: "Для себя",
          family_member: "Для члена семьи"
        } as Record<string, string>
      }
    : {
        eyebrow: "Team workspace",
        untitledCase: "Untitled case",
        caseIdPrefix: "Case",
        setupTitle: "This case needs Supabase Auth configured",
        setupDescription: "Configured authentication is required for access.",
        accessErrorTitle: "Access error",
        accessErrorHeading: "Case unavailable",
        accessErrorDescription: "Access could not be verified.",
        loadErrorLabel: "Case unavailable",
        loadErrorHeading: "Loading error",
        loadErrorDescription: "The case could not be loaded.",
        title: "Case",

        clientLabel: "Client",
        clientUnnamed: "No name",
        email: "Email",
        phone: "Phone",
        deliveryEmail: "Delivery email",
        deliveryPhone: "Delivery phone",
        recipient: "Recipient",
        deliveryAddress: "Delivery address",
        deliveryExtra: "Additional details",
        dash: "—",

        situationLabel: "Situation description",
        situationHeading: "From the questionnaire",
        situationEmpty: "No description was provided.",

        conversationLabel: "Client chat",
        conversationHeading: "Case conversation",
        conversationHint:
          "The client sees these messages in their cabinet. You can write text or record a voice message.",
        conversationAria: "Client chat",

        paymentsLabel: "Payments",
        paymentsTitle: "Automatic payments",
        paymentsDescription:
          "Only payments automatically confirmed by the payment processor appear here.",
        paymentsEmpty: "There are no automatically confirmed payments yet.",
        paymentsAria: "Case payments",

        reviewAria: "Analyses review",

        documentsLabel: "Documents",
        documentsHeading: "Upload history",
        documentsHint:
          "Uploads, newest first. Re-uploading a file with the same name is marked as a new version — that is the client's progression.",
        documentsEmpty: "No documents have been uploaded yet.",
        documentsAria: "Case documents",
        documentFallbackName: "Document",
        openFile: "Open file",

        activityLabel: "History",
        activityHeading: "What happened on this case",
        activityHint:
          "Case actions, newest first: questionnaire, payments, support periods, requests. Archived classification records are kept in the audit trail and are not shown here.",
        activityEmpty: "Nothing has happened yet.",
        activityAria: "Case history",

        clientAssistantLabel: "Client and AI assistant",
        clientAssistantHeading: "Client conversation with the assistant",
        clientAssistantHint:
          "The client's questions, replies and Anham's automatic messages are saved here. Read the conversation before replying.",
        clientAssistantEmpty: "There are no messages in this conversation yet.",
        clientAssistantAria: "Client conversation with the AI assistant",

        assistantLabel: "Professor Python AI assistant",
        assistantHeading: "Assistant for this case",
        assistantAria: "Case AI assistant",
        assistantHint:
          "The assistant sees a snapshot of this case from the database: the questionnaire, the document list, payments and history. It cannot read the contents of uploaded files — but you can attach them to the chat directly, up to 30 photos or PDFs at a time. Images are compressed automatically, and a large set is read in parts and assembled into one review. Attachments are not stored anywhere.",
        assistantIntro:
          "I can see this case's data: the questionnaire, the document list, payments and history. Ask me for a summary, a draft reply for the client, or suggested next steps. You can attach photos and PDFs with the paperclip — up to 30 at a time, and I will read them all. Decisions belong to Professor Python.",
        assistantPlaceholder: "For example: summarise this case…",
        assistantSuggestions: [
          "Review the attached analyses using the method",
          "Summarise this case",
          "What is missing from this case?",
          "Draft a reply for the client"
        ],

        submissionsAria: "Onboarding questionnaires",
        submissionLabel: "Questionnaire",
        submissionMissingHeading: "No questionnaire submitted",
        submissionMissingText:
          "The client has not filled in the onboarding questionnaire yet.",
        submissionFrom: "Questionnaire from",
        submissionHeading: "Client answers",

        backToCases: "← Back to all cases",

        yes: "Yes",
        no: "No",

        payloadFields: {
          full_name: "Full name",
          phone: "Phone",
          care_recipient_type: "Who the request is for",
          primary_goal: "Primary goal",
          situation_description: "Situation description",
          offer_accepted: "Offer accepted",
          offer_version: "Offer version",
          consent_accepted: "Consent to data processing",
          submitted_at: "Submitted"
        } as Record<string, string>,
        careRecipients: {
          self: "For myself",
          family_member: "For a family member"
        } as Record<string, string>
      };
}

export type CaseDetailCopy = ReturnType<typeof caseDetailCopy>;
