"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  STAFF_ASSIGNABLE_SUPPORT_STATUSES,
  type StaffAssignableSupportStatus,
  type SupportRequestActionState
} from "@/lib/support/types";
import { writeAuditLog } from "@/lib/audit/log";
import { writeLifecycleEvent } from "@/lib/cases/lifecycle";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

function errorState(message: string): SupportRequestActionState {
  return { status: "error", message };
}

function isStaffAssignableStatus(
  value: string
): value is StaffAssignableSupportStatus {
  return (STAFF_ASSIGNABLE_SUPPORT_STATUSES as readonly string[]).includes(
    value
  );
}

export async function createSupportRequest(
  _previousState: SupportRequestActionState,
  formData: FormData
): Promise<SupportRequestActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState(SERVICE_UNAVAILABLE_MESSAGE);
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/cabinet");
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!subject) {
    return errorState("Укажите тему сообщения.");
  }

  if (!body) {
    return errorState("Напишите текст сообщения.");
  }

  if (subject.length > 200) {
    return errorState("Тема должна быть короче 200 символов.");
  }

  if (body.length > 5000) {
    return errorState("Сообщение должно быть короче 5000 символов.");
  }

  const { data: clientCase } = await supabase
    .from("client_cases")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: request, error: insertError } = await supabase
    .from("support_requests")
    .insert({
      profile_id: user.id,
      case_id: clientCase?.id ?? null,
      category: "other",
      status: "open",
      subject,
      body
    })
    .select("id")
    .single();

  if (insertError) {
    return errorState(insertError.message);
  }

  await Promise.all([
    writeAuditLog({
      profileId: user.id,
      caseId: clientCase?.id ?? null,
      actorId: user.id,
      actorRole: "client",
      action: "support_request_created",
      entityTable: "support_requests",
      entityId: request.id
    }),
    clientCase?.id
      ? writeLifecycleEvent({
          profileId: user.id,
          caseId: clientCase.id,
          eventType: "support_requested",
          actorId: user.id,
          actorRole: "client",
          metadata: { support_request_id: request.id }
        })
      : Promise.resolve(null)
  ]);

  revalidatePath("/cabinet");

  return {
    status: "success",
    message: "Сообщение отправлено. Команда ответит вам по указанным контактам."
  };
}

export async function updateSupportRequestStatus(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return { status: "error", message: "Нет доступа для изменения статуса." };
  }

  const requestId = String(formData.get("requestId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!isUuid(requestId) || !isStaffAssignableStatus(nextStatus)) {
    return { status: "error", message: "Некорректные данные обращения." };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Service role key не настроен — смена статуса недоступна."
    };
  }

  const { data: request, error } = await supabase
    .from("support_requests")
    .update({ status: nextStatus })
    .eq("id", requestId)
    .select("id, profile_id, case_id")
    .maybeSingle();

  if (error) {
    return { status: "error", message: error.message };
  }

  if (!request) {
    return { status: "error", message: "Обращение не найдено." };
  }

  await writeAuditLog({
    profileId: request.profile_id,
    caseId: request.case_id,
    actorId: auth.userId,
    actorRole: auth.role,
    action: "support_request_status_changed",
    entityTable: "support_requests",
    entityId: request.id,
    metadata: { next_status: nextStatus }
  });

  revalidatePath("/admin/requests");

  return { status: "success", message: "Статус обновлён." };
}
