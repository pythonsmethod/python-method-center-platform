"use server";

import { revalidatePath } from "next/cache";
import { normalizeMetricName } from "@/lib/metrics/chart";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MetricActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialMetricActionState: MetricActionState = {
  status: "idle",
  message: ""
};

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
