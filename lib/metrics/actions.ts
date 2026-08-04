"use server";

import type { MetricActionState } from "@/lib/metrics/action-state";
import { revalidatePath } from "next/cache";
import { normalizeMetricName } from "@/lib/metrics/chart";
import { readExtractedRow, MAX_EXTRACTED_ROWS } from "@/lib/metrics/extraction";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";



function errorState(message: string): MetricActionState {
  return { status: "error", message };
}

// Everything runs under the person's own session: RLS limits every row to
// their own profile, so no service key is needed and none is used.
export async function addMetricEntry(
  _previous: MetricActionState,
  formData: FormData
): Promise<MetricActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState("Сессия истекла — войдите заново.");
  }

  const name = normalizeMetricName(String(formData.get("metric_name") ?? ""));
  const rawValue = String(formData.get("value") ?? "").trim().replace(",", ".");
  const value = Number(rawValue);
  const unit = String(formData.get("unit") ?? "").trim().slice(0, 30) || null;
  const measuredAt = String(formData.get("measured_at") ?? "").trim();

  if (!name || name.length > 80) {
    return errorState("Укажите название показателя — например, «Гемоглобин».");
  }

  if (!rawValue || !Number.isFinite(value)) {
    return errorState("Значение должно быть числом — как в бланке анализа.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredAt)) {
    return errorState("Укажите дату сдачи анализа.");
  }

  const { error } = await supabase.from("health_metrics").insert({
    profile_id: user.id,
    metric_name: name,
    value,
    unit,
    measured_at: measuredAt
  });

  if (error) {
    return errorState(
      "Не удалось сохранить. Попробуйте ещё раз — а если повторится, напишите в поддержку."
    );
  }

  revalidatePath("/cabinet/metrics");

  return { status: "success", message: `«${name}» записан.` };
}

export async function deleteMetricEntry(
  _previous: MetricActionState,
  formData: FormData
): Promise<MetricActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const id = String(formData.get("entry_id") ?? "");

  // RLS guarantees only the caller's own row can match this delete.
  const { error } = await supabase.from("health_metrics").delete().eq("id", id);

  if (error) {
    return errorState("Не удалось удалить запись.");
  }

  revalidatePath("/cabinet/metrics");

  return { status: "success", message: "Запись удалена." };
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
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState("Сессия истекла — войдите заново.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(String(formData.get("rows") ?? "[]"));
  } catch {
    return errorState("Не удалось прочитать выбранные показатели.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return errorState("Отметьте хотя бы один показатель.");
  }

  const rows = parsed
    .slice(0, MAX_EXTRACTED_ROWS)
    .map(readExtractedRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length === 0) {
    return errorState("Ни один показатель не прошёл проверку — внесите вручную.");
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
    return errorState(
      "Не удалось сохранить. Попробуйте ещё раз — а если повторится, напишите в поддержку."
    );
  }

  revalidatePath("/cabinet/metrics");

  return {
    status: "success",
    message: `Записано показателей: ${rows.length}.`
  };
}
