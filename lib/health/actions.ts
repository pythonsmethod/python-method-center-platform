"use server";

import { revalidatePath } from "next/cache";
import type { QuestionnaireActionState } from "@/lib/health/action-state";
import { getQuestionnaire } from "@/lib/health/queries";
import { readQuestionnaire, isSameAnswers } from "@/lib/health/questionnaire";
import { getLocale } from "@/lib/i18n/locale";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const messages = {
  ru: {
    expired: "Сессия истекла — войдите заново.",
    incomplete: "Заполните, пожалуйста, отмеченные поля.",
    birth_date: "Проверьте дату рождения.",
    height_cm: "Проверьте рост — он указывается в сантиметрах.",
    weight_kg: "Проверьте вес — он указывается в килограммах.",
    failed: "Не удалось сохранить анкету. Попробуйте ещё раз — а если повторится, напишите в поддержку.",
    unchanged: "Анкета уже сохранена в этом виде — изменений нет.",
    saved: "Анкета сохранена. Прежняя версия осталась в истории."
  },
  en: {
    expired: "Your session has expired — please sign in again.",
    incomplete: "Please fill in the marked fields.",
    birth_date: "Please check the date of birth.",
    height_cm: "Please check the height — it is given in centimetres.",
    weight_kg: "Please check the weight — it is given in kilograms.",
    failed: "The questionnaire could not be saved. Please try again — and if it keeps happening, write to support.",
    unchanged: "This questionnaire is already saved exactly like this — nothing changed.",
    saved: "Questionnaire saved. The previous version stays in your history."
  }
} as const;

// Saving is an insert, never an update.
//
// The table refuses updates outright, so this is not a convention that can
// drift: a correction is a new version and the answers behind it stay
// readable. What the person typed is stored as they typed it — nothing here
// tidies a complaint into a category or shortens a description.
export async function saveQuestionnaire(
  _previousState: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const locale = await getLocale();
  const t = messages[locale];
  const fail = (message: string): QuestionnaireActionState => ({
    status: "error",
    message,
    missing: []
  });

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return fail(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return fail(t.expired);
  }

  const read = readQuestionnaire(formData);

  if (read.status === "invalid") {
    return fail(t[read.field as "birth_date" | "height_cm" | "weight_kg"] ?? t.failed);
  }

  if (read.status === "incomplete") {
    return { status: "error", message: t.incomplete, missing: read.missing };
  }

  // Opening the form and saving it untouched would otherwise put today's
  // date on an answer given months ago, and the history is read for exactly
  // that: when something changed.
  const existing = await getQuestionnaire();
  const current = existing.status === "ready" ? existing.current : null;

  if (current && isSameAnswers(read.version, current)) {
    return { status: "success", message: t.unchanged, missing: [] };
  }

  const { error } = await supabase
    .from("health_questionnaire_versions")
    .insert({ ...read.version, profile_id: user.id });

  if (error) {
    // The table may not exist until the owner runs the migration; the
    // person should read a human sentence, not a database error.
    return fail(t.failed);
  }

  revalidatePath("/cabinet/health");
  revalidatePath("/cabinet");

  return { status: "success", message: t.saved, missing: [] };
}
