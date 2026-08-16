import { sanitizeTimes } from "@/lib/supplements/schedule";

export const MAX_EXTRACTED_SUPPLEMENTS = 30;

export type ExtractedSupplement = {
  name: string;
  dose: string | null;
  times: string[];
  notes: string | null;
  timing_note: string | null;
};

export const SUPPLEMENT_EXTRACTION_PROMPT = `Ты распознаёшь список добавок по фотографиям упаковок, этикеткам и приложенным документам.

Верни ТОЛЬКО JSON без markdown:
{"rows":[{"name":"Магний","dose":"400 мг","times":["20:00"],"notes":"После еды","timing_note":"Вечером после еды"}]}

Правила:
- Переноси только явно видимые название, дозировку и указания. Ничего не назначай и не придумывай.
- Если время явно указано, переведи его в HH:MM. Если указано только «утром» — 08:00, «днём» — 13:00, «вечером» — 20:00, «перед сном» — 22:00.
- Если времени нет, предложи 08:00 как редактируемое значение и обязательно напиши в timing_note, что время нужно проверить.
- timing_note — короткая общая подсказка только о времени/совместимости с едой или разнесении между добавками. Не меняй дозировку, не предлагай новые добавки, не ставь диагнозов.
- Язык name, dose, notes и timing_note должен совпадать с языком исходного документа.
- Объедини повторяющиеся строки одной добавки. Максимум 30 строк.
- Если ничего не удалось прочитать, верни {"rows":[]}.`;

function isolateJson(raw: string): string {
  const fenced = raw.trim().match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1].trim() : raw.trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

export function readExtractedSupplement(value: unknown): ExtractedSupplement | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const name = String(row.name ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const times = sanitizeTimes(Array.isArray(row.times) ? row.times.map(String) : []);
  if (!name) return null;
  return {
    name,
    dose: String(row.dose ?? "").trim().slice(0, 120) || null,
    times: times.length ? times : ["08:00"],
    notes: String(row.notes ?? "").trim().slice(0, 300) || null,
    timing_note: String(row.timing_note ?? "").trim().slice(0, 300) || null
  };
}

export function parseSupplementExtraction(raw: string): ExtractedSupplement[] | null {
  try {
    const parsed = JSON.parse(isolateJson(raw)) as { rows?: unknown };
    if (!Array.isArray(parsed.rows)) return null;
    const seen = new Set<string>();
    return parsed.rows.slice(0, MAX_EXTRACTED_SUPPLEMENTS).map(readExtractedSupplement)
      .filter((row): row is ExtractedSupplement => Boolean(row))
      .filter((row) => { const key = row.name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
  } catch {
    return null;
  }
}
