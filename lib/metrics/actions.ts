"use server";

import type { MetricActionState } from "@/lib/metrics/action-state";
import { revalidatePath } from "next/cache";
import { normalizeMetricName } from "@/lib/metrics/chart";
import { readExtractedRow, MAX_EXTRACTED_ROWS } from "@/lib/metrics/extraction";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale, type Locale } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/plural";



function errorState(message: string): MetricActionState {
  return { status: "error", message };
}

function localizedError(locale: Locale, ru: string, en: string): MetricActionState {
  return errorState(locale === "ru" ? ru : en);
}

// Everything runs under the person's own session: RLS limits every row to
// their own profile, so no service key is needed and none is used.
export async function addMetricEntry(
  _previous: MetricActionState,
  formData: FormData
): Promise<MetricActionState> {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return localizedError(locale, SERVICE_UNAVAILABLE_MESSAGE, "The service is temporarily unavailable.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return localizedError(locale, "Сессия истекла — войдите заново.", "Your session has expired. Please sign in again.");
  }

  const name = normalizeMetricName(String(formData.get("metric_name") ?? ""));
  const rawValue = String(formData.get("value") ?? "").trim().replace(",", ".");
  const value = Number(rawValue);
  const unit = String(formData.get("unit") ?? "").trim().slice(0, 30) || null;
  const measuredAt = String(formData.get("measured_at") ?? "").trim();

  if (!name || name.length > 80) {
    return localizedError(locale, "Укажите название показателя — например, «Гемоглобин».", "Enter a metric name, such as “Hemoglobin.”");
  }

  if (!rawValue || !Number.isFinite(value)) {
    return localizedError(locale, "Значение должно быть числом — как в бланке анализа.", "Enter the numeric value shown on your lab report.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredAt)) {
    return localizedError(locale, "Укажите дату сдачи анализа.", "Enter the date of the test.");
  }

  const { error } = await supabase.from("health_metrics").insert({
    profile_id: user.id,
    metric_name: name,
    value,
    unit,
    measured_at: measuredAt
  });

  if (error) {
    return localizedError(locale, "Не удалось сохранить. Попробуйте ещё раз — а если повторится, напишите в поддержку.", "Could not save the entry. Try again, and contact support if it happens again.");
  }

  revalidatePath("/cabinet/metrics");

  return { status: "success", message: locale === "ru" ? `«${name}» записан.` : `“${name}” saved.` };
}

export async function deleteMetricEntry(
  _previous: MetricActionState,
  formData: FormData
): Promise<MetricActionState> {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return localizedError(locale, SERVICE_UNAVAILABLE_MESSAGE, "The service is temporarily unavailable.");
  }

  const id = String(formData.get("entry_id") ?? "");

  // RLS guarantees only the caller's own row can match this delete.
  const { error } = await supabase.from("health_metrics").delete().eq("id", id);

  if (error) {
    return localizedError(locale, "Не удалось удалить запись.", "Could not delete the entry.");
  }

  revalidatePath("/cabinet/metrics");

  return { status: "success", message: locale === "ru" ? "Запись удалена." : "Entry deleted." };
}

// Saves the rows a person confirmed after the assistant read them off their
// printout. Every row is validated here again, exactly as strictly as the
// manual form validates one: what arrives is a form submission from a
// browser, and the fact that a model proposed it earlier gives it no
// standing at all.
export async function saveExtractedMetrics(
  _previous: MetricActionState,
  formData: FormData
): Promise<MetricActionState> {
  const locale = await getLocale();
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return localizedError(locale, SERVICE_UNAVAILABLE_MESSAGE, "The service is temporarily unavailable.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return localizedError(locale, "Сессия истекла — войдите заново.", "Your session has expired. Please sign in again.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return localizedError(locale, "Не удалось прочитать выбранные показатели.", "Could not read the selected metrics.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return localizedError(locale, "Отметьте хотя бы один показатель.", "Select at least one metric.");
  }

  const rows = parsed
    .slice(0, MAX_EXTRACTED_ROWS)
    .map(readExtractedRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) {
    return localizedError(locale, "Ни один показатель не прошёл проверку — внесите вручную.", "None of the selected metrics passed validation. Add them manually instead.");
  }

  const { error } = await supabase.from("health_metrics").insert(
    rows.map((row) => ({
      profile_id: user.id,
      metric_name: row.name,
      value: row.value,
      unit: row.unit,
      measured_at: row.measured_at
    }))
  );

  if (error) {
    return localizedError(locale, "Не удалось сохранить. Попробуйте ещё раз — а если повторится, напишите в поддержку.", "Could not save the metrics. Try again, and contact support if it happens again.");
  }

  revalidatePath("/cabinet/metrics");

  return {
    status: "success",
    message: locale === "ru"
      ? `Записано показателей: ${rows.length}.`
      : `${rows.length} ${plural(rows.length, { rule: "en", one: "metric", few: "metrics", many: "metrics" })} saved.`
  };
}
