// The cheap first pass over a document: the header only.
//
// Who the document is about, which laboratory, which sample number, which
// dates. Not the values — those come from the full double reading later.
// This pass exists because two questions have to be answered before a
// document is read in full: whether it belongs to this person at all, and
// whether it is the same study the case already holds.

export const METADATA_SEPARATOR = ":";

export const METADATA_FIELDS = [
  "ФИО",
  "ДАТА РОЖДЕНИЯ",
  "ЛАБОРАТОРИЯ",
  "НОМЕР",
  "ДАТА ЗАБОРА",
  "ДАТА ОТЧЁТА",
  "ЯЗЫК"
] as const;

export const METADATA_SYSTEM_PROMPT = `Ты читаешь только шапку медицинского документа. Ты НЕ переписываешь значения анализов, НЕ анализируешь и ничего не советуешь.

## Формат ответа
Ровно семь строк, в этом порядке, каждая — ПОЛЕ: значение. Если поля в документе нет — поставь прочерк «—». Ничего не выдумывай и не вычисляй.

ФИО: фамилия, имя и отчество пациента ровно как напечатаны
ДАТА РОЖДЕНИЯ: как напечатана
ЛАБОРАТОРИЯ: название лаборатории или учреждения
НОМЕР: номер заказа, образца или регистрации (accession), если напечатан
ДАТА ЗАБОРА: дата взятия материала или исследования ровно как напечатана
ДАТА ОТЧЁТА: дата выдачи результата ровно как напечатана
ЯЗЫК: язык документа одним словом

Все даты переписывай посимвольно: сохраняй порядок чисел и разделители. Не переводи даты в другой формат и не выбирай день и месяц по языку документа.

Больше ничего в ответе быть не должно.`;

export type DocumentHeader = {
  fullName: string | null;
  // ISO only when the printed date has one valid interpretation; the
  // printed text is kept beside it even when the date stays unresolved.
  birthDate: string | null;
  birthDatePrinted: string | null;
  laboratory: string | null;
  accession: string | null;
  collectionDate: string | null;
  collectionDatePrinted: string | null;
  reportDate: string | null;
  // Optional for previously saved headers; new extractions always include it.
  reportDatePrinted?: string | null;
  language: string | null;
};

const EMPTY = /^[\s—–\-.]*$/;

function clean(value: string | undefined): string | null {
  const text = (value ?? "").trim();

  return text.length === 0 || EMPTY.test(text) ? null : text;
}

// Accept ISO or a numeric day/month date with exactly one valid reading.
// Neither the separator nor the document language proves a date convention.
// Ambiguous, invalid and composite strings remain printed-only. A guessed
// date would silently affect identity, document versions and chronology.
export function toIsoDate(printed: string | null): string | null {
  if (!printed) {
    return null;
  }

  const text = printed.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return isRealDate(text) ? text : null;
  }

  const numeric = text.match(/^(\d{1,2})([./-])(\d{1,2})\2(\d{4})$/);
  if (!numeric) return null;

  const [, first, , second, year] = numeric;
  const a = first.padStart(2, "0");
  const b = second.padStart(2, "0");
  const candidates = [...new Set([`${year}-${b}-${a}`, `${year}-${a}-${b}`].filter(isRealDate))];
  return candidates.length === 1 ? candidates[0] : null;
}

function isRealDate(iso: string): boolean {
  const parsed = new Date(`${iso}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
}

export function parseMetadata(reply: string): DocumentHeader {
  const fields: Record<string, string> = {};

  for (const line of reply.split("\n")) {
    const at = line.indexOf(METADATA_SEPARATOR);

    if (at === -1) {
      continue;
    }

    const key = line.slice(0, at).trim().toUpperCase().replace(/Ё/g, "Е");
    const value = line.slice(at + 1).trim();

    fields[key] = value;
  }

  const get = (name: (typeof METADATA_FIELDS)[number]) =>
    clean(fields[name.replace(/Ё/g, "Е")]);

  const birthPrinted = get("ДАТА РОЖДЕНИЯ");
  const collectionPrinted = get("ДАТА ЗАБОРА");
  const reportPrinted = get("ДАТА ОТЧЁТА");

  return {
    fullName: get("ФИО"),
    birthDate: toIsoDate(birthPrinted),
    birthDatePrinted: birthPrinted,
    laboratory: get("ЛАБОРАТОРИЯ"),
    accession: get("НОМЕР"),
    collectionDate: toIsoDate(collectionPrinted),
    collectionDatePrinted: collectionPrinted,
    reportDate: toIsoDate(reportPrinted),
    reportDatePrinted: reportPrinted,
    language: get("ЯЗЫК")
  };
}
