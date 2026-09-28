import { isOncologyAnalyte } from "@/lib/analysis/analyte-labels";

export const ONCOLOGY_REVIEW_GUIDANCE_VERSION = "pmc-oncology-review-1.0-draft";

// Internal questions from the owner-supplied oncology specification v1.0
// (2026-09-27). They are not reference intervals, patient facts, clinical
// rules, approved knowledge cards or client-facing advice. A Case's actual
// source-linked observations decide which questions are relevant.
const REVIEW_CONTEXT: Record<string, { ru: string; en: string }> = {
  afp: { ru: "AFP: цель исследования, беременность и сведения о печени, если есть.", en: "AFP: test purpose, pregnancy and available liver context." },
  cea: { ru: "CEA: цель исследования и сведения о курении, если есть.", en: "CEA: test purpose and available smoking history." },
  psa: { ru: "PSA: точная форма (общий, свободный, доля), цель и данные о простате или лечении, если есть.", en: "PSA: exact form (total, free, percentage), purpose and available prostate or treatment context." },
  ca125: { ru: "CA 125: цель исследования и доступный гинекологический контекст; не делать вывод по одному числу.", en: "CA 125: test purpose and available gynecologic context; do not conclude from one number." },
  ca19_9: { ru: "CA 19-9: имеющиеся сведения о желчных путях и печени; не приписывать числу причину.", en: "CA 19-9: available biliary and liver context; do not assign a cause to the number." },
  ca15_3: { ru: "CA 15-3: цель наблюдения; не смешивать с CA 27-29.", en: "CA 15-3: monitoring purpose; do not merge with CA 27-29." },
  ca27_29: { ru: "CA 27-29: цель наблюдения; отдельный ряд от CA 15-3.", en: "CA 27-29: monitoring purpose; keep separate from CA 15-3." },
  hcg: { ru: "hCG: точная форма и репродуктивный контекст; не выбирать форму по названию семейства.", en: "hCG: exact form and reproductive context; do not infer a form from the family name." },
  calcitonin: { ru: "Кальцитонин: указан ли базальный или стимулированный тест и контекст лечения щитовидной железы.", en: "Calcitonin: whether the test is basal or stimulated and available thyroid treatment context." },
  thyroglobulin: { ru: "Тиреоглобулин: лечение щитовидной железы и anti-Tg, если указаны; anti-Tg — отдельный показатель.", en: "Thyroglobulin: thyroid treatment and anti-Tg if recorded; anti-Tg is a separate test." },
  cga: { ru: "CgA: приём ИПП и функция почек, если известны; не советовать менять препараты.", en: "CgA: PPI use and renal function if known; do not advise changing medicines." },
  nse: { ru: "NSE: наличие отметки о гемолизе; не выводить диагноз из измерения.", en: "NSE: whether hemolysis is reported; do not infer a diagnosis from a result." },
  cyfra21_1: { ru: "CYFRA 21-1: цель наблюдения; лабораторное имя не подтверждает гистологию.", en: "CYFRA 21-1: monitoring purpose; the laboratory name does not establish histology." },
  scc_ag: { ru: "SCC-Ag: отличить измерение антигена от сокращения SCC в патологии.", en: "SCC-Ag: distinguish an antigen measurement from SCC in pathology text." },
  he4: { ru: "HE4: функция почек и контекст назначения, если доступны; не рассчитывать ROMA по догадке.", en: "HE4: renal function and test purpose if available; do not invent a ROMA calculation." },
  ldh: { ru: "ЛДГ: неспецифичный показатель; общая ЛДГ и изоферменты не один анализ.", en: "LDH: nonspecific result; total LDH and isoenzymes are distinct tests." },
  b2m: { ru: "β2-микроглобулин: материал крови или мочи и функция почек, если известны.", en: "Beta-2 microglobulin: blood or urine specimen and renal function if known." },
  ca72_4: { ru: "CA 72-4: метод и контекст назначения; не сравнивать разные методы автоматически.", en: "CA 72-4: assay method and purpose; do not automatically compare different methods." }
};

export function oncologyReviewGuidance(analytes: ReadonlyArray<string | null>, locale: "ru" | "en"): string {
  const keys = new Set(analytes.filter(isOncologyAnalyte).map(key =>
    key.startsWith("psa_") ? "psa" : key.startsWith("hcg_") ? "hcg" : key
  ));
  const lines = [...keys].map(key => REVIEW_CONTEXT[key]?.[locale]).filter((line): line is string => Boolean(line));
  if (!lines.length) return "";
  return locale === "ru"
    ? `\n\nВНУТРЕННИЕ ВОПРОСЫ ПО ОНКОМАРКЕРАМ (черновой список, не факты пациента и не решение Карена). Используй только сведения, реально видимые в Case; отсутствующие называй вопросами. Не передавай эти строки клиенту как утверждение:\n${lines.join("\n")}`
    : `\n\nINTERNAL TUMOR MARKER REVIEW QUESTIONS (draft checklist, not patient facts or Karen's decision). Use only data actually present in the Case; ask about missing context. Do not present these lines to the client as findings:\n${lines.join("\n")}`;
}
