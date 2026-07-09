"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import {
  CASE_DIRECTIONS,
  CASE_STATUSES,
  CASE_URGENCIES,
  PAYMENT_PRODUCTS,
  includesValue
} from "@/lib/cases/constants";
import { writeLifecycleEvent } from "@/lib/cases/lifecycle";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

const amountPattern = /^\d{1,7}(?:[.,]\d{1,2})?$/;

function errorState(message: string): StaffActionState {
  return { status: "error", message };
}

function successState(message: string): StaffActionState {
  return { status: "success", message };
}

export async function updateCaseState(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const caseId = String(formData.get("caseId") ?? "");

  if (!isUuid(caseId)) {
    return errorState("Некорректный идентификатор кейса.");
  }

  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return errorState("Нет доступа для изменения кейса.");
  }

  const nextStatus = String(formData.get("status") ?? "");
  const nextUrgency = String(formData.get("urgency") ?? "");
  const nextDirection = String(formData.get("direction") ?? "");

  if (
    !includesValue(CASE_STATUSES, nextStatus) ||
    !includesValue(CASE_URGENCIES, nextUrgency) ||
    !includesValue(CASE_DIRECTIONS, nextDirection)
  ) {
    return errorState("Недопустимое значение статуса кейса.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState("Service role key не настроен — обновление недоступно.");
  }

  const { data: currentCase, error: lookupError } = await supabase
    .from("client_cases")
    .select("id, profile_id, status, urgency, direction")
    .eq("id", caseId)
    .maybeSingle();

  if (lookupError) {
    return errorState(lookupError.message);
  }

  if (!currentCase) {
    return errorState("Кейс не найден.");
  }

  const { error: updateError } = await supabase
    .from("client_cases")
    .update({
      status: nextStatus,
      urgency: nextUrgency,
      direction: nextDirection
    })
    .eq("id", caseId);

  if (updateError) {
    return errorState(updateError.message);
  }

  await Promise.all([
    writeAuditLog({
      profileId: currentCase.profile_id,
      caseId,
      actorId: auth.userId,
      actorRole: auth.role,
      action: "case_state_updated",
      entityTable: "client_cases",
      entityId: caseId,
      metadata: {
        from_status: currentCase.status,
        to_status: nextStatus,
        from_urgency: currentCase.urgency,
        to_urgency: nextUrgency,
        from_direction: currentCase.direction,
        to_direction: nextDirection
      }
    }),
    currentCase.status !== nextStatus
      ? writeLifecycleEvent({
          profileId: currentCase.profile_id,
          caseId,
          eventType: "status_changed",
          fromStatus: currentCase.status,
          toStatus: nextStatus,
          actorId: auth.userId,
          actorRole: auth.role
        })
      : Promise.resolve(null)
  ]);

  revalidatePath(`/admin/cases/${caseId}`);

  return successState("Кейс обновлён.");
}

export async function recordCasePayment(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const caseId = String(formData.get("caseId") ?? "");

  if (!isUuid(caseId)) {
    return errorState("Некорректный идентификатор кейса.");
  }

  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return errorState("Нет доступа для записи оплаты.");
  }

  const product = String(formData.get("product") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD")
    .trim()
    .toUpperCase();
  const processorReference = String(
    formData.get("processorReference") ?? ""
  ).trim();

  if (!includesValue(PAYMENT_PRODUCTS, product)) {
    return errorState("Выберите продукт оплаты.");
  }

  if (!amountPattern.test(amountRaw)) {
    return errorState(
      "Укажите сумму цифрами без разделителей тысяч, например 490 или 490.50."
    );
  }

  const amount = Number(amountRaw.replace(",", "."));

  if (!Number.isFinite(amount) || amount <= 0) {
    return errorState("Укажите корректную сумму оплаты.");
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return errorState("Валюта указывается кодом из 3 букв, например USD.");
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState("Service role key не настроен — запись оплаты недоступна.");
  }

  const { data: currentCase, error: lookupError } = await supabase
    .from("client_cases")
    .select("id, profile_id")
    .eq("id", caseId)
    .maybeSingle();

  if (lookupError) {
    return errorState(lookupError.message);
  }

  if (!currentCase) {
    return errorState("Кейс не найден.");
  }

  const amountCents = Math.round(amount * 100);
  const paidAt = new Date().toISOString();

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      profile_id: currentCase.profile_id,
      case_id: caseId,
      product,
      status: "paid",
      amount_cents: amountCents,
      currency,
      processor_reference: processorReference || null,
      paid_at: paidAt,
      metadata: {
        recorded_by: auth.userId,
        recorded_via: "admin_case_page"
      }
    })
    .select("id")
    .single();

  if (paymentError) {
    return errorState(paymentError.message);
  }

  await Promise.all([
    writeAuditLog({
      profileId: currentCase.profile_id,
      caseId,
      actorId: auth.userId,
      actorRole: auth.role,
      action: "payment_recorded",
      entityTable: "payments",
      entityId: payment.id,
      metadata: {
        product,
        amount_cents: amountCents,
        currency,
        processor_reference: processorReference || null
      }
    }),
    writeLifecycleEvent({
      profileId: currentCase.profile_id,
      caseId,
      eventType: "payment_recorded",
      actorId: auth.userId,
      actorRole: auth.role,
      metadata: {
        payment_id: payment.id,
        product,
        amount_cents: amountCents,
        currency
      }
    })
  ]);

  revalidatePath(`/admin/cases/${caseId}`);

  return successState("Оплата зафиксирована.");
}
