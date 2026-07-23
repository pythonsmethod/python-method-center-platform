"use server";

import { revalidatePath } from "next/cache";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

function errorState(message: string): StaffActionState {
  return { status: "error", message };
}

// Client sends a text message into their own case thread.
export async function sendClientCaseMessage(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const body = String(formData.get("body") ?? "").trim();

  if (!body || body.length > 8000) {
    return errorState("Введите сообщение (до 8000 символов).");
  }

  const authClient = await createSupabaseServerClient();
  const supabase = createSupabaseServiceClient();

  if (!authClient || !supabase) {
    return errorState("Сервис временно недоступен.");
  }

  const {
    data: { user }
  } = await authClient.auth.getUser();

  if (!user) {
    return errorState("Войдите в аккаунт, чтобы написать команде.");
  }

  const { data: caseRow } = await supabase
    .from("client_cases")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!caseRow) {
    return errorState("Сначала заполните анкету — она создаст ваш кейс.");
  }

  const { error } = await supabase.from("case_messages").insert({
    case_id: caseRow.id,
    profile_id: user.id,
    sender_id: user.id,
    sender_role: "client",
    body
  });

  if (error) {
    return errorState(`Не удалось отправить: ${error.message}`);
  }

  revalidatePath("/cabinet");

  return { status: "success", message: "Сообщение отправлено команде." };
}

// Staff (Karen/team) sends a text message into a case thread.
export async function sendStaffCaseMessage(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const caseId = String(formData.get("caseId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!isUuid(caseId)) {
    return errorState("Некорректный идентификатор кейса.");
  }

  if (!body || body.length > 8000) {
    return errorState("Введите сообщение (до 8000 символов).");
  }

  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return errorState("Нет доступа.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState("Service role key не настроен.");
  }

  const { data: caseRow } = await supabase
    .from("client_cases")
    .select("id, profile_id")
    .eq("id", caseId)
    .maybeSingle();

  if (!caseRow) {
    return errorState("Кейс не найден.");
  }

  const { error } = await supabase.from("case_messages").insert({
    case_id: caseRow.id,
    profile_id: caseRow.profile_id,
    sender_id: auth.userId,
    sender_role: auth.role,
    body
  });

  if (error) {
    return errorState(`Не удалось отправить: ${error.message}`);
  }

  revalidatePath(`/admin/cases/${caseId}`);

  return { status: "success", message: "Сообщение отправлено клиенту." };
}
