"use server";

import { revalidatePath } from "next/cache";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

const AUDIENCES = ["client", "staff", "both"] as const;

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

  if (!title || title.length > 200) {
    return errorState("Укажите заголовок (до 200 символов).");
  }

  if (!content || content.length > 8000) {
    return errorState("Укажите текст знания (до 8000 символов).");
  }

  if (!AUDIENCES.includes(audience as (typeof AUDIENCES)[number])) {
    return errorState("Недопустимая аудитория.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState("Service role key не настроен — сохранение недоступно.");
  }

  const { error } = await supabase.from("assistant_knowledge").insert({
    title,
    content,
    audience,
    created_by: auth.userId
  });

  if (error) {
    return errorState(`Не удалось сохранить: ${error.message}`);
  }

  revalidatePath("/admin");

  return successState("Знание сохранено. Ассистенты будут использовать его в новых диалогах.");
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
