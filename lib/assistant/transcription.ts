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
  reason: "разные значения" | "прочитано только один раз" | "чтение неуверенное";
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

## Формат ответа
Одна строка на одно значение. Ровно шесть полей, разделитель ${TRANSCRIPTION_SEPARATOR.trim()}:

ФАЙЛ${TRANSCRIPTION_SEPARATOR}РАЗДЕЛ${TRANSCRIPTION_SEPARATOR}НАЗВАНИЕ СТРОКИ${TRANSCRIPTION_SEPARATOR}ЗНАЧЕНИЕ${TRANSCRIPTION_SEPARATOR}РЕФЕРЕНС${TRANSCRIPTION_SEPARATOR}ДА или НЕТ${TRANSCRIPTION_SEPARATOR}примечание

- ФАЙЛ — имя файла, как оно названо перед изображением. Не выдумывай имя.
- РАЗДЕЛ — заголовок бланка или исследования, к которому относится строка.
- НАЗВАНИЕ СТРОКИ — подпись поля ровно как напечатана, включая скобки и единицы.
- ЗНАЧЕНИЕ — ровно то, что напечатано. Единицы измерения оставляй как в бланке.
- РЕФЕРЕНС — референсный интервал, напечатанный в бланке рядом с этой строкой, ровно как напечатан: «12-15.5», «120 - 155», «до 5,0». Если рядом ничего не напечатано — поставь прочерк. Не бери интервал из другой строки и не вычисляй его сам.
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
    .replace(/\s+/g, " ")
    .replace(/,/g, ".")
    .replace(/[.,;]+$/, "")
    .trim();
}

function keyOf(value: TranscribedValue): string {
  return [normaliseKey(value.file), normaliseKey(value.section), normaliseKey(value.label)].join(
    "|"
  );
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

    const hasReference = answers(tail[1]);
    const reference = hasReference ? (tail[0] ?? "") : "";
    const confidence = hasReference ? tail[1] : tail[0];
    const rest = tail.slice(hasReference ? 2 : 1);

    rows.push({
      file,
      section,
      label,
      value,
      reference,
      // Settled by the comparison of the two readings, never by one of
      // them alone.
      referenceConfirmed: false,
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
  const agreed: TranscribedValue[] = [];
  const disputed: DisputedValue[] = [];

  const secondByKey = new Map<string, TranscribedValue>();

  for (const row of second) {
    secondByKey.set(keyOf(row), row);
  }

  const seen = new Set<string>();

  for (const row of first) {
    const key = keyOf(row);
    seen.add(key);
    const match = secondByKey.get(key);

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
    agreed.push({
      ...row,
      referenceConfirmed: referenceRangesMatch(row.reference, match.reference)
    });
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
