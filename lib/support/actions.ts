"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupportRequestActionState } from "@/lib/support/types";
import { writeAuditLog } from "@/lib/audit/log";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const staffAssignableStatuses = [
  "in_progress",
  "waiting_on_client",
  "resolved",
  "closed"
] as const;

type StaffAssignableStatus = (typeof staffAssignableStatuses)[number];

function errorState(message: string): SupportRequestActionState {
  return { status: "error", message };
}

function isStaffAssignableStatus(
  value: string
): value is StaffAssignableStatus {
  return staffAssignableStatuses.includes(value as StaffAssignableStatus);
}

export async function createSupportRequest(
  _previousState: SupportRequestActionState,
  formData: FormData
): Promise<SupportRequestActionState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState("Сервис временно недоступен: не настроено подключение к базе данных.");
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

  await writeAuditLog({
    profileId: user.id,
    caseId: clientCase?.id ?? null,
    actorId: user.id,
    actorRole: "client",
    action: "support_request_created",
    entityTable: "support_requests",
    entityId: request.id
  });

  revalidatePath("/cabinet");

  return {
    status: "success",
    message: "Сообщение отправлено. Команда ответит вам по указанным контактам."
  };
}

export async function updateSupportRequestStatus(
  formData: FormData
): Promise<void> {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    redirect("/admin/requests");
  }

  const requestId = String(formData.get("requestId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!requestId || !isStaffAssignableStatus(nextStatus)) {
    redirect("/admin/requests");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    redirect("/admin/requests");
  }

  const { data: request, error } = await supabase
    .from("support_requests")
    .update({ status: nextStatus })
    .eq("id", requestId)
    .select("id, profile_id, case_id")
    .single();

  if (!error && request) {
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
  }

  revalidatePath("/admin/requests");
  redirect("/admin/requests");
}
