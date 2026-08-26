"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  STAFF_ASSIGNABLE_SUPPORT_STATUSES,
  type StaffAssignableSupportStatus,
  type SupportRequestActionState
} from "@/lib/support/types";
import { writeAuditLog } from "@/lib/audit/log";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
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
    notifyTeam({
      kind: "support_request",
      dedupeKey: `support_request:${request.id}`,
      title: "📨 Новое обращение из кабинета",
      lines: [
        `Клиент: ${user.email ?? user.id}`,
        `Тема: ${subject.slice(0, 120)}`,
        "Откройте раздел «Обращения», чтобы ответить."
      ],
      link: adminLink("/admin/requests")
    }),
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

export async function sendClientSupportMessage(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const requestId = String(formData.get("requestId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const locale = String(formData.get("locale") ?? "ru") === "en" ? "en" : "ru";

  if (!isUuid(requestId) || !body || body.length > 8000) {
    return errorState(
      locale === "en"
        ? "Enter a message of up to 8,000 characters."
        : "Введите сообщение до 8000 символов."
    );
  }

  const authClient = await createSupabaseServerClient();
  const supabase = createSupabaseServiceClient();
  if (!authClient || !supabase) {
    return errorState(
      locale === "en" ? "The service is temporarily unavailable." : SERVICE_UNAVAILABLE_MESSAGE
    );
  }

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return errorState(locale === "en" ? "Sign in to send a message." : "Войдите, чтобы отправить сообщение.");
  }

  const { data: request } = await supabase
    .from("support_requests")
    .select("id, profile_id, case_id, subject")
    .eq("id", requestId)
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!request) {
    return errorState(locale === "en" ? "Request not found." : "Обращение не найдено.");
  }

  const { data: message, error } = await supabase
    .from("support_request_messages")
    .insert({
      support_request_id: request.id,
      profile_id: user.id,
      sender_id: user.id,
      sender_role: "client",
      body
    })
    .select("id")
    .single();

  if (error) {
    return errorState(error.message);
  }

  await Promise.all([
    supabase
      .from("support_requests")
      .update({ status: "in_progress" })
      .eq("id", request.id),
    notifyTeam({
      kind: "support_request",
      dedupeKey: `support_message:${message.id}`,
      title: "💬 Новый ответ клиента в обращении",
      lines: [
        `Клиент: ${user.email ?? user.id}`,
        `Тема: ${request.subject.slice(0, 120)}`,
        "Откройте обращение, чтобы прочитать и ответить."
      ],
      link: adminLink(`/admin/requests#request-${request.id}`)
    }),
    writeAuditLog({
      profileId: user.id,
      caseId: request.case_id,
      actorId: user.id,
      actorRole: "client",
      action: "support_message_created",
      entityTable: "support_request_messages",
      entityId: message.id
    })
  ]);

  revalidatePath("/cabinet/chat");
  revalidatePath("/admin/requests");
  return {
    status: "success",
    message: locale === "en" ? "Message sent." : "Сообщение отправлено."
  };
}

export async function sendStaffSupportMessage(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const requestId = String(formData.get("requestId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!isUuid(requestId) || !body || body.length > 8000) {
    return errorState("Введите сообщение до 8000 символов.");
  }

  const auth = await getStaffUserState();
  if (auth.status !== "authorized") {
    return errorState("Нет доступа.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return errorState("Service role key не настроен.");
  }

  const { data: request } = await supabase
    .from("support_requests")
    .select("id, profile_id, case_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!request) {
    return errorState("Обращение не найдено.");
  }
  if (!request.profile_id) {
    return errorState("Это обращение гостя. Ответьте по указанному email.");
  }

  const { data: message, error } = await supabase
    .from("support_request_messages")
    .insert({
      support_request_id: request.id,
      profile_id: request.profile_id,
      sender_id: auth.userId,
      sender_role: auth.role,
      body
    })
    .select("id")
    .single();

  if (error) {
    return errorState(error.message);
  }

  await Promise.all([
    supabase
      .from("support_requests")
      .update({ status: "waiting_on_client" })
      .eq("id", request.id),
    writeAuditLog({
      profileId: request.profile_id,
      caseId: request.case_id,
      actorId: auth.userId,
      actorRole: auth.role,
      action: "support_message_created",
      entityTable: "support_request_messages",
      entityId: message.id
    })
  ]);

  revalidatePath("/admin/requests");
  revalidatePath("/cabinet/chat");
  return { status: "success", message: "Ответ сохранён и отправлен клиенту в кабинет." };
}
