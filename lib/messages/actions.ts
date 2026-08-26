"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { writeLifecycleEvent } from "@/lib/cases/lifecycle";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
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

  const { data: message, error } = await supabase
    .from("case_messages")
    .insert({
      case_id: caseRow.id,
      profile_id: user.id,
      sender_id: user.id,
      sender_role: "client",
      body
    })
    .select("id")
    .single();

  if (error) {
    return errorState(`Не удалось отправить: ${error.message}`);
  }

  // External ping to the team; message content stays in the platform.
  await notifyTeam({
    kind: "client_message",
    dedupeKey: `client_message:${message.id}`,
    title: "✉️ Новое сообщение от клиента",
    lines: [
      `Клиент: ${user.email ?? user.id}`,
      `Кейс: ${caseRow.id}`,
      "Откройте чат кейса, чтобы прочитать и ответить."
    ],
    link: adminLink(`/admin/cases/${caseRow.id}`)
  });

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
  let successMessage = "Сообщение отправлено клиенту.";

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
    .select("id, profile_id, status")
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

  // The first real staff reply means the submitted case is now being
  // actively reviewed. The status predicate makes this transition
  // concurrency-safe and prevents later lifecycle states from moving back.
  if (caseRow.status === "ready_for_review") {
    const { data: transitionedCase, error: transitionError } = await supabase
      .from("client_cases")
      .update({ status: "in_review" })
      .eq("id", caseRow.id)
      .eq("status", "ready_for_review")
      .select("id")
      .maybeSingle();

    if (transitionError) {
      successMessage =
        "Сообщение отправлено клиенту, но статус кейса не обновился автоматически. Обновите его вручную.";
    }

    if (transitionedCase) {
      await Promise.all([
        writeAuditLog({
          profileId: caseRow.profile_id,
          caseId: caseRow.id,
          actorId: auth.userId,
          actorRole: auth.role,
          action: "case_state_updated",
          entityTable: "client_cases",
          entityId: caseRow.id,
          metadata: {
            from_status: "ready_for_review",
            to_status: "in_review",
            trigger: "first_staff_reply"
          }
        }),
        writeLifecycleEvent({
          profileId: caseRow.profile_id,
          caseId: caseRow.id,
          eventType: "status_changed",
          fromStatus: "ready_for_review",
          toStatus: "in_review",
          actorId: auth.userId,
          actorRole: auth.role,
          metadata: { trigger: "first_staff_reply" }
        })
      ]);
    }
  }

  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/cases");
  revalidatePath("/admin");
  revalidatePath("/cabinet");

  return { status: "success", message: successMessage };
}
