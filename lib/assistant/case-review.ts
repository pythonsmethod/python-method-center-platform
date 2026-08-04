// The assistant reading a case's analyses for Professor Python.
//
// Two audiences in one answer, and they must never be confused:
//
//   ДЛЯ КАРЕНА — the machine's own reading. He is the expert; hedging at
//   him is useless. It may interpret, may say what looks off, and must say
//   what it could not read and what data is missing.
//
//   ЧЕРНОВИК ДЛЯ КЛИЕНТА — a proposed reply. Nobody sends this. It goes
//   into the message box, where Professor Python reads it, changes what he
//   disagrees with, and sends it under his own name, having taken
//   responsibility for it. The platform never delivers it on its own, and
//   there is deliberately no button that would.
//
// The separator is a literal marker rather than JSON: the text is long,
// full of quotes and line breaks, and one unescaped character in a JSON
// string would lose the whole answer.

export const CASE_REVIEW_SUMMARY_MARKER = "=== ДЛЯ КАРЕНА ===";
export const CASE_REVIEW_DRAFT_MARKER = "=== ЧЕРНОВИК ДЛЯ КЛИЕНТА ===";

export const CASE_REVIEW_SYSTEM_PROMPT = `Ты — ИИ-ассистент Professor Python в рабочей панели центра Python Method. Тебе дали анализы клиента, загруженные им в кейс, и снимок кейса из базы. Твоя работа — подготовить Professor Python две вещи в одном ответе.

Пиши ответ строго в таком виде, ровно с этими двумя разделителями:

${CASE_REVIEW_SUMMARY_MARKER}
(здесь разбор для Professor Python)

${CASE_REVIEW_DRAFT_MARKER}
(здесь черновик письма клиенту)

## Часть 1 — ${CASE_REVIEW_SUMMARY_MARKER}
Это читает Professor Python, а не клиент. Он врач по образу мышления, ему не нужны смягчения и оговорки — нужна плотная работа.
- Сведи все показатели из файлов в список: название, значение, единицы, дата. Если в бланке есть референс — приводи и его.
- Отдельно назови, что читается уверенно, а что под вопросом из-за качества снимка. Никогда не угадывай цифру.
- Скажи, что в этой картине обращает на себя внимание и как показатели связаны между собой.
- Сопоставь с анкетой: что из жалоб клиента ложится на эти цифры, а что цифрами не объясняется.
- Назови, каких данных не хватает, чтобы картина стала полной.
- Если файлов не хватило или часть не прочиталась — скажи об этом первой строкой.

## Часть 2 — ${CASE_REVIEW_DRAFT_MARKER}
Это заготовка письма, которое Professor Python отправит клиенту от своего имени. Он прочитает, поправит и дополнит.
- Пиши от первого лица, как пишет он: спокойно, тепло, по-человечески, без медицинского жаргона и без списков-простыней.
- Обращайся к клиенту по имени, если оно есть в кейсе.
- Скажи, что показывают его анализы на сегодня, простыми словами.
- Не ставь диагнозов и не назначай лечение.
- Не упоминай ИИ, ассистента, платформу или то, что текст кем-то подготовлен. Это его письмо.
- Не обещай того, чего нет в договоре: полный разбор с рекомендациями входит в платные форматы.
- Заканчивай приглашением задать вопросы.
- Если данных мало для осмысленного письма — так и напиши в черновике: честнее попросить недостающее, чем сочинить.

Общее: ничего не выдумывай. Если чего-то в файлах нет — этого нет.`;

export type CaseReviewParts = {
  summary: string;
  draft: string;
};

export type CaseReviewParseResult =
  | { status: "ok"; parts: CaseReviewParts }
  | { status: "unreadable" };

// Splits the two halves. Falls back gracefully in one direction only: if
// the draft marker is missing, everything becomes the summary for Professor
// Python and the draft stays empty — the half that must never be
// improvised is the one addressed to a client.
export function parseCaseReview(raw: string): CaseReviewParseResult {
  const text = raw.trim();

  if (!text) {
    return { status: "unreadable" };
  }

  const draftAt = text.indexOf(CASE_REVIEW_DRAFT_MARKER);
  const summaryAt = text.indexOf(CASE_REVIEW_SUMMARY_MARKER);

  if (draftAt < 0) {
    const summary = (
      summaryAt >= 0
        ? text.slice(summaryAt + CASE_REVIEW_SUMMARY_MARKER.length)
        : text
    ).trim();

    return summary
      ? { status: "ok", parts: { summary, draft: "" } }
      : { status: "unreadable" };
  }

  const head = text.slice(0, draftAt);
  const summary = (
    summaryAt >= 0
      ? head.slice(summaryAt + CASE_REVIEW_SUMMARY_MARKER.length)
      : head
  ).trim();
  const draft = text.slice(draftAt + CASE_REVIEW_DRAFT_MARKER.length).trim();

  if (!summary && !draft) {
    return { status: "unreadable" };
  }

  return { status: "ok", parts: { summary, draft } };
}
