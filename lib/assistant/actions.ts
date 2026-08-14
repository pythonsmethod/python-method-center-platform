"use server";

import { revalidatePath } from "next/cache";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

const AUDIENCES = ["client", "staff", "both"] as const;

// Where an entry belongs. A "sleep" entry does two jobs: it grounds the
// assistant like any other knowledge, and it is shown to the person on the
// sleep page as Professor Python's own words.
const TOPICS = ["general", "sleep"] as const;

function errorState(message: string): StaffActionState {
  return { status: "error", message };
}

function successState(message: string): StaffActionState {
  return { status: "success", message };
}

export async function addKnowledgeEntry(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return errorState("Нет доступа к базе знаний.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const audience = String(formData.get("audience") ?? "client");
  const topic = String(formData.get("topic") ?? "general");

  if (!title || title.length > 200) {
    return errorState("Укажите заголовок (до 200 символов).");
  }

  if (!content || content.length > 8000) {
    return errorState("Укажите текст знания (до 8000 символов).");
  }

  if (!AUDIENCES.includes(audience as (typeof AUDIENCES)[number])) {
    return errorState("Недопустимая аудитория.");
  }

  if (!TOPICS.includes(topic as (typeof TOPICS)[number])) {
    return errorState("Недопустимый раздел.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState("Service role key не настроен — сохранение недоступно.");
  }

  const entry = {
    title,
    content,
    audience,
    created_by: auth.userId
  };

  let { error } = await supabase
    .from("assistant_knowledge")
    .insert({ ...entry, topic });

  // The topic column arrives with a migration, and the site is deployed
  // before the SQL is run. Losing the ability to save knowledge in that
  // window would be a worse failure than losing the topic, so the entry is
  // saved without it and the reason is said out loud.
  if (error && /topic/i.test(error.message)) {
    const retry = await supabase.from("assistant_knowledge").insert(entry);

    if (!retry.error) {
      revalidatePath("/admin");

      return successState(
        "Знание сохранено, но без раздела: в базе ещё нет столбца topic. Прогоните миграцию — тогда записи про сон начнут показываться клиентам."
      );
    }

    error = retry.error;
  }

  if (error) {
    return errorState(`Не удалось сохранить: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/cabinet/sleep");

  return successState(
    topic === "sleep"
      ? "Сохранено. Это появится у клиентов в разделе «Мой сон» как ваша рекомендация, и помощник будет опираться на неё."
      : "Знание сохранено. Ассистенты будут использовать его в новых диалогах."
  );
}

export async function setKnowledgeEntryActive(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return errorState("Нет доступа к базе знаний.");
  }

  const entryId = String(formData.get("entryId") ?? "");
  const nextActive = String(formData.get("nextActive") ?? "") === "true";

  if (!isUuid(entryId)) {
    return errorState("Некорректный идентификатор записи.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState("Service role key не настроен — изменение недоступно.");
  }

  const { error } = await supabase
    .from("assistant_knowledge")
    .update({ is_active: nextActive, updated_at: new Date().toISOString() })
    .eq("id", entryId);

  if (error) {
    return errorState(`Не удалось изменить: ${error.message}`);
  }

  revalidatePath("/admin");

  return successState(nextActive ? "Знание включено." : "Знание выключено.");
}
