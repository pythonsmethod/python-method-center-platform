import type { Locale } from "@/lib/i18n/locale";
import type { GapAudience, GapTopic } from "@/lib/assistant/escalation";

// Every word the founder's knowledge-gap centre shows, in both languages.
//
// Kept out of the components so the pages, the list, the detail view, the
// navigation badge and the knowledge drafts cannot drift apart, and so a
// missing translation is a type error rather than a Russian sentence on an
// English page.

type Bilingual = Record<Locale, string>;

const TOPIC_LABELS: Record<GapTopic, Bilingual> = {
  service_scope: { ru: "Услуги и работа центра", en: "Services and how the centre works" },
  pricing_and_plans: { ru: "Цены и форматы сопровождения", en: "Pricing and support formats" },
  payment_or_refund: { ru: "Оплаты и возвраты", en: "Payments and refunds" },
  access_or_account: { ru: "Доступ и аккаунт", en: "Access and account" },
  documents_and_uploads: { ru: "Документы и загрузки", en: "Documents and uploads" },
  schedule_and_timing: { ru: "Сроки и расписание", en: "Timing and schedule" },
  methodology: { ru: "Метод и подход", en: "Method and approach" },
  medical_review: { ru: "Вопрос в компетенции Professor Python", en: "Question within Professor Python's competence" },
  unclassified: { ru: "Без определённой темы", en: "No identified subject" }
};

const AUDIENCE_LABELS: Record<GapAudience, Bilingual> = {
  client: { ru: "Разговор с клиентом", en: "Client conversation" },
  staff: { ru: "Разговор с командой", en: "Team conversation" }
};

const TARGET_LABELS: Record<string, Bilingual> = {
  karen: { ru: "Передано Professor Python", en: "Handed to Professor Python" },
  support: { ru: "Передано в поддержку", en: "Handed to support" },
  team: { ru: "Передано команде", en: "Handed to the team" },
  clarify: { ru: "Запрошено уточнение", en: "Clarification requested" }
};

export function gapTopicLabel(topic: GapTopic, locale: Locale): string {
  return TOPIC_LABELS[topic][locale];
}

export function gapAudienceLabel(audience: GapAudience, locale: Locale): string {
  return AUDIENCE_LABELS[audience][locale];
}

export function gapTargetLabel(target: string, locale: Locale): string {
  return TARGET_LABELS[target]?.[locale] ?? target.replaceAll("_", " ");
}

export function gapLocaleLabel(value: "ru" | "en", locale: Locale): string {
  if (locale === "ru") {
    return value === "ru" ? "Русский интерфейс" : "Английский интерфейс";
  }

  return value === "ru" ? "Russian interface" : "English interface";
}

/**
 * The inactive knowledge placeholder opened for a topic.
 *
 * Deliberately bilingual in one string: the title is also the deduplication
 * key, so it must not change with whichever language the founder happened to
 * be reading when the gap was recorded. The text is derived from the topic
 * alone and contains nothing from any conversation.
 */
export function gapDraftSeed(topic: GapTopic): { title: string; content: string } {
  const label = TOPIC_LABELS[topic];

  return {
    title: `Пробел знаний: ${label.ru} / Knowledge gap: ${label.en}`,
    content: [
      `Черновик создан автоматически: помощник не смог ответить по теме «${label.ru}» и честно передал вопрос дальше.`,
      "Впишите сюда точный ответ центра и только затем включите запись и выберите аудиторию.",
      "",
      `Draft opened automatically: the assistant could not answer on the subject "${label.en}" and honestly handed the question on.`,
      "Write the centre's exact answer here, then activate the entry and choose its audience.",
      "",
      "В этом черновике нет вопроса клиента и нет медицинских данных. / This draft contains no client question and no medical data."
    ].join("\n")
  };
}

export function notificationsCopy(locale: Locale) {
  return locale === "ru"
    ? {
        eyebrow: "Кабинет основателя",
        title: "Пробелы в знаниях помощника",
        description:
          "Здесь появляются случаи, когда Анхам честно сказал, что не может подтвердить ответ, и передал вопрос дальше. Записана только тема — без вопроса клиента, без медицинских данных и без указания человека.",
        listLabel: "Список пробелов",
        empty: "Пробелов пока нет: помощник отвечал из доступных знаний.",
        errorTitle: "Не удалось загрузить",
        errorText: "Список пробелов сейчас недоступен.",
        accessTitle: "Раздел недоступен",
        accessText: "Этот раздел открыт только основателю.",
        setupText: "Подключение к базе не настроено.",
        unread: "Не прочитано",
        read: "Прочитано",
        unreadCount: "непрочитанных",
        markRead: "Отметить прочитанным",
        markUnread: "Вернуть в непрочитанные",
        open: "Открыть",
        back: "← Ко всем пробелам",
        topic: "Тема",
        audience: "Где произошло",
        target: "Куда передан вопрос",
        language: "Язык интерфейса",
        occurred: "Когда",
        draftTitle: "Черновик знания",
        draftText:
          "Для этой темы открыт неактивный черновик в разделе «ИИ и знания». Он не попадает в ответы помощника, пока вы не впишете ответ и не включите его.",
        draftMissing: "Черновик для этой темы не открыт.",
        draftLink: "Перейти к знаниям",
        privacyTitle: "Что здесь не хранится",
        privacyText:
          "Вопрос клиента, медицинские данные и любой идентификатор человека сюда не копируются. Внешние уведомления — Telegram, почта — по этим событиям не отправляются.",
        notFound: "Событие не найдено.",
        actionFailed: "Не удалось сохранить состояние. Попробуйте ещё раз.",
        navLabel: "Пробелы знаний"
      }
    : {
        eyebrow: "Founder workspace",
        title: "Assistant knowledge gaps",
        description:
          "This is where Anham's honest refusals appear: moments it could not confirm an answer and handed the question on. Only the subject is recorded — no client question, no medical data and no identification of the person.",
        listLabel: "Knowledge gap list",
        empty: "No gaps yet: the assistant answered from available knowledge.",
        errorTitle: "Could not load",
        errorText: "The gap list is unavailable right now.",
        accessTitle: "Section unavailable",
        accessText: "This section is open to the founder only.",
        setupText: "The database connection is not configured.",
        unread: "Unread",
        read: "Read",
        unreadCount: "unread",
        markRead: "Mark as read",
        markUnread: "Return to unread",
        open: "Open",
        back: "← Back to all gaps",
        topic: "Subject",
        audience: "Where it happened",
        target: "Where the question went",
        language: "Interface language",
        occurred: "When",
        draftTitle: "Knowledge draft",
        draftText:
          "An inactive draft for this subject is waiting in AI & knowledge. It cannot reach the assistant's answers until you write the answer and switch it on.",
        draftMissing: "No draft was opened for this subject.",
        draftLink: "Go to knowledge",
        privacyTitle: "What is not stored here",
        privacyText:
          "The client's question, medical data and any identifier of the person are never copied here. No external notification — Telegram or email — is sent for these events.",
        notFound: "Event not found.",
        actionFailed: "Could not save the state. Please try again.",
        navLabel: "Knowledge gaps"
      };
}

export type NotificationsCopy = ReturnType<typeof notificationsCopy>;
