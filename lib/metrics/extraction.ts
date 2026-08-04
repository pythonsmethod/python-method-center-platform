import { normalizeMetricName } from "@/lib/metrics/chart";

// Reading a lab printout into rows of a table — and nothing else.
//
// The boundary this file exists to hold: the model is a pair of eyes, not
// a doctor. It copies what is printed on the form into name/value/unit/date
// and stops there. It does not say whether a number is good, does not
// compare it to a reference range, does not name a condition and does not
// recommend anything. Every recommendation on this platform comes from
// Professor Python personally, and a machine that quietly starts giving
// them is the single failure this whole platform is built to avoid.
//
// The comparison of one set of results against an earlier one is done by
// the platform in lib/metrics/compare.ts — arithmetic, not a model. So the
// model never sees two sets at once and never has the chance to interpret
// a trend.

export const MAX_EXTRACTED_ROWS = 60;

export const EXTRACTION_SYSTEM_PROMPT = `Ты — часть платформы Python Method. Твоя единственная задача: прочитать приложенные файлы с результатами анализов и перенести напечатанные в них показатели в таблицу.

ЧТО ТЫ ДЕЛАЕШЬ
- Находишь в файле показатели, их численные значения, единицы измерения и дату сдачи.
- Возвращаешь их списком, дословно как в бланке.

ЧЕГО ТЫ НЕ ДЕЛАЕШЬ НИКОГДА
- Не оцениваешь показатели: ни «норма», ни «повышен», ни «понижен», ни «хорошо», ни «плохо».
- Не сравниваешь с референсными значениями, даже если они напечатаны в бланке рядом.
- Не называешь диагнозов, состояний и предположений о здоровье человека.
- Не даёшь рекомендаций: ни по питанию, ни по добавкам, ни по образу жизни, ни по обследованиям. Все рекомендации на платформе даёт только Professor Python лично.
- Не дописываешь показатели, которых нет в файле, и не угадываешь значения, которые не смог прочитать.

ФОРМАТ ОТВЕТА
Верни ТОЛЬКО JSON, без пояснений и без markdown-разметки:
{"rows":[{"name":"Гемоглобин","value":132,"unit":"г/л","measured_at":"2026-08-01"}]}

Правила полей:
- name — название показателя как в бланке, строкой.
- value — только число. Десятичный разделитель — точка. Если значение записано как «< 0,5» или «не обнаружено», пропусти этот показатель.
- unit — единицы как в бланке, строкой; null, если единиц нет.
- measured_at — дата сдачи в формате YYYY-MM-DD. Если в файле есть только дата печати, используй её. Если даты нет вообще, пропусти показатель.

Если в файлах нет ни одного читаемого показателя, верни {"rows":[]}.`;

export type ExtractedRow = {
  name: string;
  value: number;
  unit: string | null;
  measured_at: string;
};

export type ExtractionResult =
  | { status: "ok"; rows: ExtractedRow[] }
  | { status: "unreadable" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The model is asked for bare JSON, but a model that has been told not to
// use markdown still sometimes does. Pull the object out rather than fail
// the whole upload over a pair of backticks.
function isolateJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");

  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// Validates one row exactly as strictly as the manual form does, because
// these rows land in the same table and are drawn on the same chart.
export function readExtractedRow(value: unknown): ExtractedRow | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const name = normalizeMetricName(String(row.name ?? ""));

  if (!name || name.length > 80) {
    return null;
  }

  // Number("") is 0, and Number(null) is 0. A missing reading must never
  // become a zero on someone's health chart — a fabricated value is worse
  // than an absent one, because the person will believe it.
  const text = typeof row.value === "number" ? String(row.value) : String(row.value ?? "").trim();
  const rawValue = text === "" ? Number.NaN : Number(text.replace(",", "."));

  if (!Number.isFinite(rawValue)) {
    return null;
  }

  const rawUnit = row.unit === null || row.unit === undefined ? "" : String(row.unit);
  const unit = rawUnit.trim().slice(0, 30) || null;
  const measuredAt = String(row.measured_at ?? "").trim();

  if (!isRealDate(measuredAt)) {
    return null;
  }

  return { name, value: rawValue, unit, measured_at: measuredAt };
}

export function parseExtraction(raw: string): ExtractionResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(isolateJson(raw));
  } catch {
    return { status: "unreadable" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { status: "unreadable" };
  }

  const rows = (parsed as Record<string, unknown>).rows;

  if (!Array.isArray(rows)) {
    return { status: "unreadable" };
  }

  const seen = new Set<string>();
  const clean: ExtractedRow[] = [];

  for (const item of rows) {
    const row = readExtractedRow(item);

    if (!row) {
      continue;
    }

    // One reading per indicator per date: a printout that lists the same
    // marker twice must not draw two points on one day.
    const key = `${row.name.toLowerCase()}|${row.measured_at}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    clean.push(row);

    if (clean.length >= MAX_EXTRACTED_ROWS) {
      break;
    }
  }

  return { status: "ok", rows: clean };
}
