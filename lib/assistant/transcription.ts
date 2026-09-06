// Reading a client's documents twice, and comparing the two readings.
//
// This exists because of a real error. A discharge summary carried a table
// whose value column was printed offset from its row labels, and the
// assistant slid by one row: it read the body-mass index, 25, as the answer
// in the row "Smoking (yes, no)" and reported a non-smoker as a smoker. It
// then wrote, three paragraphs later, that the smoking figure could not be
// interpreted — asserting a fact it had already admitted it could not read.
//
// Every number of the forty-odd laboratory values was correct. The mistake
// was not arithmetic; it was alignment, and no amount of care in a prompt
// makes alignment reliable on a photograph of creased paper.
//
// So the values are read twice, independently, and the two readings are
// compared by machine. Where they agree, the value is trusted. Where they
// disagree — or where either reading was unsure, or one saw a field the
// other did not — the value is never quietly picked. It is named, with the
// file it came from, so a person can open that file and settle it.
//
// The comparison is deliberately mechanical. Asking a model whether two of
// its own readings agree puts the same judgement in charge of checking
// itself.

import { referenceRangesMatch } from "@/lib/analysis/reference-range";

export const TRANSCRIPTION_SEPARATOR = " :: ";

export type TranscribedRowState = "FILLED" | "EMPTY" | "UNSELECTED_TEMPLATE" | "UNCERTAIN";

export type TranscribedValue = {
  // The file this was read from, exactly as it is named in the case, so a
  // person can find it.
  file: string;
  section: string;
  label: string;
  value: string;
  // The reference interval printed beside the value, exactly as printed.
  // It is the fingerprint of the unit: 9.6 beside "12-15.5" and 96 beside
  // "120-155" are the same haemoglobin written on two different scales,
  // and nothing else on the form says which scale was used.
  reference: string;
  // Whether both readings found the same interval. An interval only one
  // reading saw, or the two disagreed on, decides no unit: the difference
  // between the two readings is a factor of ten in what the value means.
  referenceConfirmed: boolean;
  // Explicit structural state returned by new readers. Optional only so
  // historical raw readings remain replayable through the legacy fallback.
  rowState?: TranscribedRowState;
  confident: boolean;
  // What exactly is unclear, in the reader's own words.
  note: string;
};

export type DisputedValue = {
  file: string;
  section: string;
  label: string;
  // What each reading saw. null means that reading did not report the field
  // at all — which is itself a disagreement worth a human's eyes.
  first: string | null;
  second: string | null;
  reason: "разные значения" | "прочитано только один раз" | "чтение неуверенное" | "источник виден не полностью";
  note: string;
};

export type TranscriptionComparison = {
  agreed: TranscribedValue[];
  disputed: DisputedValue[];
};

// Instruction for the reading pass. Deliberately narrow: this pass does not
// interpret, compare with norms or advise. It writes down what is on the
// paper, and says where it cannot.
export const TRANSCRIPTION_SYSTEM_PROMPT = `Ты переписываешь содержимое медицинских документов. Ты НЕ анализируешь, не сравниваешь с нормами, не ставишь диагнозы и ничего не советуешь. Твоя единственная задача — перенести в текст то, что напечатано на бумаге, ничего не потеряв и ничего не добавив.

## Сначала проверь целостность изображения
Первой строкой всегда напиши служебную строку:
ФАЙЛ${TRANSCRIPTION_SEPARATOR}[КОНТРОЛЬ ИСТОЧНИКА]${TRANSCRIPTION_SEPARATOR}[ПОКРЫТИЕ ДОКУМЕНТА]${TRANSCRIPTION_SEPARATOR}COMPLETE, PARTIAL или UNREADABLE${TRANSCRIPTION_SEPARATOR}-${TRANSCRIPTION_SEPARATOR}ДА или НЕТ${TRANSCRIPTION_SEPARATOR}что именно обрезано, закрыто серым/чёрным полем, размыто или отсутствует

- COMPLETE — весь лист виден и пригоден для чтения.
- PARTIAL — видна только часть листа, край обрезан, часть заменена однотонным серым/чёрным полем или перекрыта.
- UNREADABLE — содержимое практически нельзя прочитать.
- Эта строка описывает качество источника и никогда не является медицинским фактом.

## Формат ответа
Одна строка на одно значение. Ровно восемь полей, разделитель ${TRANSCRIPTION_SEPARATOR.trim()}:

ФАЙЛ${TRANSCRIPTION_SEPARATOR}РАЗДЕЛ${TRANSCRIPTION_SEPARATOR}НАЗВАНИЕ СТРОКИ${TRANSCRIPTION_SEPARATOR}ЗНАЧЕНИЕ${TRANSCRIPTION_SEPARATOR}РЕФЕРЕНС${TRANSCRIPTION_SEPARATOR}ROW_STATE${TRANSCRIPTION_SEPARATOR}ДА или НЕТ${TRANSCRIPTION_SEPARATOR}примечание

- ФАЙЛ — имя файла, как оно названо перед изображением. Не выдумывай имя.
- РАЗДЕЛ — заголовок бланка или исследования, к которому относится строка.
- НАЗВАНИЕ СТРОКИ — подпись поля ровно как напечатана, включая скобки и единицы.
- ЗНАЧЕНИЕ — ровно то, что напечатано. Единицы измерения оставляй как в бланке.
- РЕФЕРЕНС — референсный интервал, напечатанный в бланке рядом с этой строкой, ровно как напечатан: «12-15.5», «120 - 155», «до 5,0». Если рядом ничего не напечатано — поставь прочерк. Не бери интервал из другой строки и не вычисляй его сам.
- ROW_STATE — строго одно значение: FILLED (поле действительно заполнено), EMPTY (поле пустое), UNSELECTED_TEMPLATE (виден только печатный список вариантов и ни один вариант не выбран) или UNCERTAIN (возможно есть запись/отметка, но её состояние нельзя надёжно определить). Не заменяй эти слова синонимами.
- Если внутри одного поля есть печатные варианты шаблона («норма», «увеличен», «не увеличен», «повышена», «понижена») и рядом внесены размеры или рукописный текст, не включай печатный вариант в ЗНАЧЕНИЕ без видимого подчёркивания, обведения, галочки или другого однозначного выбора. Перенеси только внесённые данные. Если невозможно понять, выбран ли печатный вариант, поставь ROW_STATE UNCERTAIN и объясни это в примечании.
- ДА или НЕТ — уверен ли ты в прочтении этой строки полностью.
- Примечание — если НЕТ, напиши, что именно не разобрал и почему (блик, сгиб, обрезан край, размыто). Если ДА, поставь прочерк.

Больше ничего в ответе быть не должно: ни вступления, ни выводов, ни пустых строк между блоками.

## Что переносить
Переноси ВСЁ, что есть в документах, а не выборку:
- каждое лабораторное значение с единицами;
- каждый размер, каждую дату, каждый номер регистра и карты;
- назначенные препараты с дозировками и схемами приёма — одной строкой на препарат;
- текст заключений и описаний целиком, дословно, одной строкой на заключение;
- фамилии врачей, названия учреждений, номера документов;
- поля анкет и таблиц осмотра, включая рост, вес, курение, алкоголь.

Одно слово может оказаться решающим. Пропущенное поле — это потерянное слово.

## Таблицы: главное правило
В бланках колонка значений часто напечатана со сдвигом относительно названий строк. Поэтому:
- Никогда не сопоставляй строку и значение по их положению на странице. Сопоставляй по смыслу.
- Если в поле с ответом «да/нет» стоит число — это ЧУЖОЕ значение, ты сбился на строку. Поставь НЕТ в поле уверенности и напиши об этом в примечании.
- Если значение не подходит по смыслу к названию строки — не подгоняй. Поставь НЕТ и опиши расхождение.
- Если в таблице значений меньше, чем строк, — не растягивай их по всем строкам. Оставь пустые.

## Рукописный текст
- Отличай напечатанный шаблон от записи врача от руки. Не выдавай список печатных вариантов за выбранный ответ.
- Читай рукопись посимвольно и сохраняй сокращения, знак, десятичный разделитель и единицы ровно как видишь.
- Если разобрана только часть слова или числа, перенеси видимую часть с маркером [неразборчиво], поставь НЕТ и укажи точное место проблемы.
- Не достраивай слово по медицинскому смыслу и не угадывай продолжение за сгибом, обрезанным краем или однотонным полем.
- Совпадение двух догадок не делает скрытый текст достоверным.

## Чего делать нельзя
- Нельзя угадывать цифру, слово или букву. Не разобрал — ставь НЕТ и пиши, что именно.
- Нельзя молча исправлять бланк. Если единица измерения в бланке кажется опечаткой — перенеси как напечатано, поставь НЕТ и напиши в примечании, что видишь опечатку.
- Нельзя дописывать то, чего в документе нет.
- Нельзя пропускать строку потому, что она кажется незначительной.`;

function normaliseKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "")
    .trim();
}

function normaliseValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[«»“”„\"'`•]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/,/g, ".")
    // Layout punctuation and spacing vary between independent readings of
    // the same prose. Keep clinically meaningful operators and decimal
    // points, but do not turn a comma, bullet or a space before a full stop
    // into a medical disagreement.
    .replace(/\s*([:;])\s*/g, " ")
    .replace(/\s*\.\s*(?!\d)/g, " ")
    .replace(/\s+([)\]])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/[.,;]+$/, "")
    .trim();
}

function labelFingerprint(value: string): string {
  const normalized = normaliseKey(value).replace(/ё/g, "е");
  if (/^[рp][нh]$/i.test(normalized.replace(/[^a-zа-я]/gi, ""))) return "ph";
  return normalized.replace(/[^a-zа-я0-9]/gi, "");
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  let short = left;
  let long = right;
  if (short.length > long.length) [short, long] = [long, short];
  let edits = 0;
  for (let i = 0, j = 0; i < short.length || j < long.length;) {
    if (short[i] === long[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (short.length === long.length) {
      i += 1;
      j += 1;
    } else {
      j += 1;
    }
  }
  return true;
}

function protectedClinicalDesignators(label: string): string[] {
  return (label.match(/[A-Za-zА-ЯЁ0-9]+/g) ?? [])
    .filter((token) =>
      /\d/.test(token) ||
      /[A-Za-z]/.test(token) ||
      /^[А-ЯЁ]{2,8}$/.test(token)
    )
    .map((token) => token.toLowerCase().replace(/ё/g, "е"));
}

function labelsAreConservativelyEquivalent(left: TranscribedValue, right: TranscribedValue): boolean {
  if (normaliseKey(left.file) !== normaliseKey(right.file)) return false;
  if (normaliseKey(left.section) !== normaliseKey(right.section)) return false;
  const a = labelFingerprint(left.label);
  const b = labelFingerprint(right.label);
  if (a === b) return true;
  // Short Latin analyte suffixes, all-caps clinical abbreviations and
  // alphanumeric identifiers are semantic, not spelling noise: IgG is not
  // IgM, ALT is not AST, and T3 is not T4 even when their values happen to
  // be identical.
  if (protectedClinicalDesignators(left.label).join("|") !== protectedClinicalDesignators(right.label).join("|")) {
    return false;
  }
  // Never smooth over a different date, measurement index or staging code.
  if (a.match(/\d+/g)?.join("|") !== b.match(/\d+/g)?.join("|")) return false;
  // A one-character OCR slip in a sufficiently descriptive label is safe
  // only when the match is unique in both readings (enforced by the caller).
  return Math.min(a.length, b.length) >= 6 && editDistanceAtMostOne(a, b);
}

function keyOf(value: TranscribedValue): string {
  return [normaliseKey(value.file), normaliseKey(value.section), normaliseKey(value.label)].join(
    "|"
  );
}

const COVERAGE_SECTION = "[контроль источника]";
const COVERAGE_LABEL = "[покрытие документа]";
type CoverageStatus = "COMPLETE" | "PARTIAL" | "UNREADABLE";

function coverageStatus(rows: TranscribedValue[]): { byFile: Map<string, CoverageStatus>; rows: TranscribedValue[] } {
  const byFile = new Map<string, CoverageStatus>();
  const clinicalRows: TranscribedValue[] = [];
  for (const row of rows) {
    if (normaliseKey(row.section) === COVERAGE_SECTION && normaliseKey(row.label) === COVERAGE_LABEL) {
      const value = row.value.trim().toUpperCase();
      if (value === "COMPLETE" || value === "PARTIAL" || value === "UNREADABLE") {
        byFile.set(normaliseKey(row.file), value);
      }
      continue;
    }
    clinicalRows.push(row);
  }
  return { byFile, rows: clinicalRows };
}

function looseKeyOf(value: TranscribedValue): string {
  return [normaliseKey(value.file), normaliseKey(value.label)].join("|");
}

type FragmentKind = "unit" | "reference";

function fragmentDescriptor(label: string): { baseLabel: string; kind: FragmentKind } | null {
  const patterns: Array<[FragmentKind, RegExp]> = [
    ["unit", /\s*(?:—|\s-\s)\s*.*(?:өлч|ед\.?\s*изм).*$/i],
    ["reference", /\s*(?:—|\s-\s)\s*.*(?:ченемин|референс).*$/i],
    ["unit", /\s*(?:—|-)?\s*\((?:[^()]*(?:өлч|ед\.?\s*изм)[^()]*)\)\s*$/i],
    ["unit", /\s*(?:—|-)?\s*(?:[^()]*өлч[^/]*\/)?ед\.?\s*(?:изм\.?)?\s*$/i],
    ["reference", /\s*(?:—|-)?\s*\((?:[^()]*(?:ченемин|референс)[^()]*)\)\s*$/i],
    ["reference", /\s*(?:—|-)?\s*(?:[^()]*ченемин[^/]*\/)?(?:референс(?:ные значения)?|реф\.?)\s*$/i],
  ];
  for (const [kind, pattern] of patterns) {
    if (!pattern.test(label)) continue;
    return { baseLabel: label.replace(pattern, "").replace(/[—-]+$/, "").trim(), kind };
  }
  return null;
}

function splitInlineReference(row: TranscribedValue): TranscribedValue {
  const match = row.value.match(/^(.*?)\s*\(\s*референс(?:ные значения)?\s*[:—-]?\s*(.*?)\s*\)\s*$/i);
  if (!match) return row;
  return { ...row, value: match[1].trim(), reference: match[2].trim() };
}

export function isExplicitlyEmptyValue(value: string): boolean {
  const normalized = normaliseValue(value)
    .replace(/^\[([^\]]+)\](?=\s|$)/, "$1")
    .replace(/^[([{]+|[)\]}]+$/g, "")
    .trim();

  return /^(?:|не заполнено|нет записи|нет значения|не вписано|пусто)(?:\s*(?:мм|см|мл|л|г|мг|ед\.?))?$/i.test(normalized);
}

export function looksLikeUnresolvedFormOptions(value: string): boolean {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  const mutuallyExclusiveLists = [
    /(?:^|,\s*)однородн[а-яё]*\s*,\s*неоднородн[а-яё]*/i,
    /(?:^|,\s*)средн[а-яё]*\s*,\s*повышен[а-яё]*\s*,\s*понижен[а-яё]*/i,
    /(?:^|,\s*)норм[а-яё]*\s*,\s*повышен[а-яё]*\s*,\s*понижен[а-яё]*/i,
    /(?:^|,\s*)не\s+расширен[а-яё]*\s*,\s*расширен[а-яё]*/i,
    /(?:^|,\s*)не\s+выявлен[а-яё]*\s*,\s*выявлен[а-яё]*/i,
    /(?:^|,\s*)ровн[а-яё]*\s*,\s*неровн[а-яё]*/i,
  ];
  return mutuallyExclusiveLists.some((pattern) => pattern.test(normalized));
}

// Some ultrasound forms print a bare state word before a blank where
// dimensions are written. Two readers can copy both the printed word and the
// handwriting identically even when the word was never selected. Without a
// visual selection signal this is not an agreed clinical assertion.
export function looksLikeUnresolvedInlineTemplateChoice(row: TranscribedValue): boolean {
  if (!/(?:размер|dimensions?|эхогенн|структур|контур)/i.test(row.label)) return false;
  const value = row.value.toLowerCase().replace(/\s+/g, " ").trim();
  if (!/^(?:норм[а-яё]*|увеличен[а-яё]*|не увеличен[а-яё]*|повышен[а-яё]*|понижен[а-яё]*)\s*[,.;:]\s*\D{0,40}\d/i.test(value)) {
    return false;
  }
  const note = normaliseValue(row.note);
  return !/(?:подч[её]ркнут|обвед[её]н|отмечен|галочк|выбран|рукопис)/i.test(note);
}

// A lone printed state word in a form field is not a medical fact unless the
// reader also records an unambiguous visible selection. Keep it in the raw
// source reading, but do not project it into clinical evidence.
export function looksLikeUnselectedStandaloneTemplateChoice(row: TranscribedValue): boolean {
  if (!/(?:размер|dimensions?|эхогенн|структур|контур)/i.test(row.label)) return false;
  const value = normaliseValue(row.value);
  if (!/^(?:норм[а-яё]*|увеличен[а-яё]*|не увеличен[а-яё]*|повышен[а-яё]*|понижен[а-яё]*)$/i.test(value)) {
    return false;
  }
  const note = normaliseValue(row.note);
  return !/(?:подч[её]ркнут|обвед[её]н|отмечен|галочк|выбран|рукопис)/i.test(note);
}

export function isExplicitlyUnfilledFormRow(row: TranscribedValue): boolean {
  const note = normaliseValue(row.note);
  return /(?:не заполнен|не вписан|не отмечен|ничего не отмечено|ни один не отмечен|отметок нет|отметк[а-яё]*\s+не\s+(?:проставлен[а-яё]*|сделан[а-яё]*))/i.test(note);
}

const ADMINISTRATIVE_ROW = /(?:^|\b)(?:ф\.?\s*и\.?\s*о\.?|фамили[яи]|имя|отчество|пациент|patient|возраст|age|дата рождения|дата\s*\([^)]*(?:рукопис|заголов|вверху)[^)]*\)|date of birth|dob|адрес|address|тел\.?|телефон|phone|паспорт|идентификационн(?:ый|ого) номер|учреждение|organization|название кабинета|лаборатори[яи]|врач|doctor|подпись|signature|штрих-?код|номер карты|номер документа)(?:\b|$)/i;
const ADMINISTRATIVE_SECTION = /^(?:шапка(?:\s+бланка)?|данные пациента|заголовок|пациент|patient|идентификация|реквизиты|служебн(?:ые данные|ая информация))$/i;

export function isClinicalContentRow(row: TranscribedValue): boolean {
  if (normaliseKey(row.section) === COVERAGE_SECTION && normaliseKey(row.label) === COVERAGE_LABEL) return false;
  if (row.rowState === "EMPTY" || row.rowState === "UNSELECTED_TEMPLATE") return false;
  if (row.rowState === "FILLED" || row.rowState === "UNCERTAIN") {
    if (ADMINISTRATIVE_SECTION.test(row.section.trim())) return false;
    return !ADMINISTRATIVE_ROW.test(row.label.trim());
  }
  if (isExplicitlyUnfilledFormRow(row)) return false;
  if (isExplicitlyEmptyValue(row.value) || looksLikeUnresolvedFormOptions(row.value)) return false;
  if (ADMINISTRATIVE_SECTION.test(row.section.trim())) return false;
  return !ADMINISTRATIVE_ROW.test(row.label.trim());
}

export type DocumentContentClassification = "EMPTY_TEMPLATE" | "CLINICAL_CONTENT";

export function classifyTranscribedDocument(
  first: TranscribedValue[],
  second: TranscribedValue[]
): DocumentContentClassification {
  return [...first, ...second].some(isClinicalContentRow) ? "CLINICAL_CONTENT" : "EMPTY_TEMPLATE";
}

export function canResolveAsVisuallyEmpty(
  first: TranscribedValue[],
  second: TranscribedValue[]
): boolean {
  const rows = [...first, ...second].filter((row) =>
    normaliseKey(row.section) !== COVERAGE_SECTION &&
    !ADMINISTRATIVE_SECTION.test(row.section.trim()) &&
    !ADMINISTRATIVE_ROW.test(row.label.trim())
  );
  if (rows.length === 0 || rows.some((row) => !row.rowState)) return false;
  if (rows.some((row) => row.rowState === "FILLED")) return false;
  return rows.some((row) => row.rowState === "UNCERTAIN");
}

// Some reading passes return one clinical row as three presentation fragments:
// result, unit and reference. Reassemble only explicit suffix-marked fragments;
// never infer association from visual position or from a merely similar label.
export function coalesceTranscriptionFragments(rows: TranscribedValue[]): TranscribedValue[] {
  const primary = new Map<string, TranscribedValue>();
  const fragments = new Map<string, Partial<Record<FragmentKind, TranscribedValue>>>();

  for (const sourceRow of rows) {
    let row = splitInlineReference(sourceRow);
    // Empty boxes and untouched form fields are provenance-bearing source
    // observations, but they are not clinical facts. Excluding only explicit
    // empty markers here prevents two readers from turning a blank into an
    // apparently verified value; uncertain handwriting stays visible.
    if (row.rowState === "EMPTY" || row.rowState === "UNSELECTED_TEMPLATE") continue;
    if (!row.rowState && isExplicitlyEmptyValue(row.value)) continue;
    if (looksLikeUnselectedStandaloneTemplateChoice(row)) continue;
    if (looksLikeUnresolvedFormOptions(row.value) || looksLikeUnresolvedInlineTemplateChoice(row)) {
      row = {
        ...row,
        confident: false,
        note: [row.note, "печатный вариант бланка не имеет подтверждённой отметки выбора"]
          .filter((part) => part && part !== "-")
          .join("; "),
      };
    }
    const descriptor = fragmentDescriptor(row.label);
    const baseLabel = descriptor?.baseLabel ?? row.label;
    const key = [normaliseKey(row.file), normaliseKey(row.section), normaliseKey(baseLabel)].join("|");
    if (descriptor) {
      fragments.set(key, { ...(fragments.get(key) ?? {}), [descriptor.kind]: row });
    } else {
      primary.set(key, row);
    }
  }

  const result: TranscribedValue[] = [];
  for (const [key, row] of primary) {
    const related = fragments.get(key);
    const unit = related?.unit?.value.trim();
    const reference = related?.reference?.value.trim();
    result.push({
      ...row,
      value: unit && !normaliseValue(row.value).endsWith(normaliseValue(unit)) ? `${row.value} ${unit}` : row.value,
      reference: reference || row.reference,
      confident: row.confident && (!related?.unit || related.unit.confident) && (!related?.reference || related.reference.confident),
      note: [row.note, related?.unit?.note, related?.reference?.note].filter((part) => part && part !== "-").join("; ") || "-",
    });
    fragments.delete(key);
  }

  // Orphan fragments remain visible for human review instead of disappearing.
  for (const related of fragments.values()) {
    result.push(...Object.values(related).filter((row): row is TranscribedValue => Boolean(row)));
  }
  return result;
}

export function parseTranscription(reply: string): TranscribedValue[] {
  const rows: TranscribedValue[] = [];

  for (const line of reply.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || !trimmed.includes(TRANSCRIPTION_SEPARATOR.trim())) {
      continue;
    }

    const parts = trimmed.split(TRANSCRIPTION_SEPARATOR.trim()).map((part) => part.trim());

    if (parts.length < 5) {
      continue;
    }

    const [file, section, label, value, ...tail] = parts;

    if (!file || !label) {
      continue;
    }

    // The reference interval was added to the format after the first
    // documents had already been read. A model also drops a field now and
    // then. So the confidence answer is found by what it says rather than
    // by where it sits: it is the да/нет, and whatever precedes it is the
    // interval. Reading position five first means an interval that itself
    // says "нет" cannot be mistaken for the answer.
    const answers = (part: string | undefined) =>
      /^(да|нет|yes|no)/i.test((part ?? "").trim());

    const rowStates: TranscribedRowState[] = ["FILLED", "EMPTY", "UNSELECTED_TEMPLATE", "UNCERTAIN"];
    const rowStateIndex = tail.findIndex((part) => rowStates.includes(part.trim().toUpperCase() as TranscribedRowState));
    const rowState = rowStateIndex >= 0 ? tail[rowStateIndex].trim().toUpperCase() as TranscribedRowState : undefined;
    const hasStructuredState = rowStateIndex >= 0;
    const hasReference = hasStructuredState ? rowStateIndex > 0 : answers(tail[1]);
    const reference = hasReference ? (tail[0] ?? "") : "";
    const confidence = hasStructuredState ? tail[rowStateIndex + 1] : hasReference ? tail[1] : tail[0];
    const rest = hasStructuredState ? tail.slice(rowStateIndex + 2) : tail.slice(hasReference ? 2 : 1);

    rows.push({
      file,
      section,
      label,
      value,
      reference,
      // Settled by the comparison of the two readings, never by one of
      // them alone.
      referenceConfirmed: false,
      rowState,
      // Anything that is not an explicit yes counts as unsure. A reading
      // that forgot to answer the question is not a confident reading.
      //
      // Matched without a word boundary on purpose: \b is defined over
      // Latin letters, so /^да\b/ never matches Cyrillic "ДА" at all — and
      // the failure is silent, turning every confident reading into a
      // disputed one.
      confident: (confidence ?? "").trim().toLowerCase().startsWith("да"),
      note: rest.join(TRANSCRIPTION_SEPARATOR.trim()).trim()
    });
  }

  return rows;
}

export function compareTranscriptions(
  first: TranscribedValue[],
  second: TranscribedValue[]
): TranscriptionComparison {
  const firstCoverage = coverageStatus(first);
  const secondCoverage = coverageStatus(second);
  first = coalesceTranscriptionFragments(firstCoverage.rows);
  second = coalesceTranscriptionFragments(secondCoverage.rows);
  const agreed: TranscribedValue[] = [];
  const disputed: DisputedValue[] = [];

  const secondByKey = new Map<string, TranscribedValue>();
  const firstByLooseKey = new Map<string, TranscribedValue[]>();
  const secondByLooseKey = new Map<string, TranscribedValue[]>();

  for (const row of second) {
    secondByKey.set(keyOf(row), row);
    secondByLooseKey.set(looseKeyOf(row), [...(secondByLooseKey.get(looseKeyOf(row)) ?? []), row]);
  }
  for (const row of first) {
    firstByLooseKey.set(looseKeyOf(row), [...(firstByLooseKey.get(looseKeyOf(row)) ?? []), row]);
  }

  const fuzzyMatches = new Map<TranscribedValue, TranscribedValue>();
  for (const row of first) {
    const candidates = second.filter((candidate) => labelsAreConservativelyEquivalent(row, candidate));
    if (candidates.length !== 1) continue;
    const candidate = candidates[0];
    const reverseCandidates = first.filter((source) => labelsAreConservativelyEquivalent(source, candidate));
    if (reverseCandidates.length === 1) fuzzyMatches.set(row, candidate);
  }

  const seen = new Set<string>();

  for (const row of first) {
    const key = keyOf(row);
    seen.add(key);
    const looseKey = looseKeyOf(row);
    const uniqueLooseMatch = firstByLooseKey.get(looseKey)?.length === 1 && secondByLooseKey.get(looseKey)?.length === 1
      ? secondByLooseKey.get(looseKey)?.[0]
      : undefined;
    const match = secondByKey.get(key) ?? uniqueLooseMatch ?? fuzzyMatches.get(row);

    if (!match) {
      disputed.push({
        file: row.file,
        section: row.section,
        label: row.label,
        first: row.value,
        second: null,
        reason: "прочитано только один раз",
        note: row.note
      });
      continue;
    }
    seen.add(keyOf(match));

    if (normaliseValue(row.value) !== normaliseValue(match.value)) {
      disputed.push({
        file: row.file,
        section: row.section,
        label: row.label,
        first: row.value,
        second: match.value,
        reason: "разные значения",
        note: [row.note, match.note].filter((part) => part && part !== "-").join("; ")
      });
      continue;
    }

    if (!row.confident || !match.confident) {
      disputed.push({
        file: row.file,
        section: row.section,
        label: row.label,
        first: row.value,
        second: match.value,
        reason: "чтение неуверенное",
        note: [row.note, match.note].filter((part) => part && part !== "-").join("; ")
      });
      continue;
    }

    // The value agreed. Whether the interval beside it also agreed is a
    // separate question with a separate consequence: a disagreement there
    // does not put the value in dispute — the two readings saw the same
    // number — but it does mean the interval cannot be used to decide the
    // unit. An unconfirmed interval resolves nothing.
    const fileKey = normaliseKey(row.file);
    const incompleteSource = [firstCoverage.byFile.get(fileKey), secondCoverage.byFile.get(fileKey)]
      .some((status) => status === "PARTIAL" || status === "UNREADABLE");
    if (incompleteSource) {
      disputed.push({
        file: row.file,
        section: row.section,
        label: row.label,
        first: row.value,
        second: match.value,
        reason: "источник виден не полностью",
        note: "совпавший видимый фрагмент не подтверждается автоматически, потому что часть документа отсутствует"
      });
    } else {
      agreed.push({
        ...row,
        referenceConfirmed: referenceRangesMatch(row.reference, match.reference)
      });
    }
  }

  for (const row of second) {
    if (seen.has(keyOf(row))) {
      continue;
    }

    disputed.push({
      file: row.file,
      section: row.section,
      label: row.label,
      first: null,
      second: row.value,
      reason: "прочитано только один раз",
      note: row.note
    });
  }

  return { agreed, disputed };
}

// What the second pass is allowed to work from. Only values both readings
// agreed on — so nothing can appear in the analysis that was not read twice
// and read the same way both times.
export function formatAgreed(values: TranscribedValue[]): string {
  if (values.length === 0) {
    return "(ни одно значение не подтвердилось двумя чтениями)";
  }

  const bySection = new Map<string, TranscribedValue[]>();

  for (const value of values) {
    const heading = `${value.section} — файл «${value.file}»`;
    bySection.set(heading, [...(bySection.get(heading) ?? []), value]);
  }

  return [...bySection.entries()]
    .map(([heading, rows]) =>
      [`### ${heading}`, ...rows.map((row) => `- ${row.label}: ${row.value}`)].join("\n")
    )
    .join("\n\n");
}

// The list a human has to settle by opening the file. It is written for
// Professor Python to act on, not as a technical dump.
export function formatDisputed(values: DisputedValue[]): string {
  if (values.length === 0) {
    return "";
  }

  return values
    .map((value) => {
      const readings =
        value.first !== null && value.second !== null
          ? `первое чтение — «${value.first}», второе — «${value.second}»`
          : `прочитано один раз: «${value.first ?? value.second}»`;

      return `- Файл «${value.file}», раздел «${value.section}», строка «${value.label}»: ${value.reason} (${readings}).${
        value.note && value.note !== "-" ? ` ${value.note}` : ""
      }`;
    })
    .join("\n");
}
