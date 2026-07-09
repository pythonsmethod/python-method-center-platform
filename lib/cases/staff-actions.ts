"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { writeLifecycleEvent } from "@/lib/cases/lifecycle";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const caseStatuses = [
  "created",
  "awaiting_onboarding",
  "ready_for_review",
  "in_review",
  "active_support",
  "inactive_support",
  "completed",
  "archived"
] as const;

const caseUrgencies = ["normal", "elevated", "critical"] as const;

const caseDirections = [
  "recovery",
  "rehabilitation",
  "preservation",
  "not_set"
] as const;

const paymentProducts = [
  "preliminary_assessment",
  "support_5_weeks",
  "support_15_weeks"
] as const;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function includesValue<T extends readonly string[]>(
  values: T,
  value: string
): value is T[number] {
  return (values as readonly string[]).includes(value);
}

function redirectToCase(caseId: string, params: Record<string, string>): never {
  const query = new URLSearchParams(params).toString();
  revalidatePath(`/admin/cases/${caseId}`);
  redirect(`/admin/cases/${caseId}${query ? `?${query}` : ""}`);
}

export async function updateCaseState(formData: FormData): Promise<void> {
  const caseId = String(formData.get("caseId") ?? "");

  if (!uuidPattern.test(caseId)) {
    redirect("/admin/cases");
  }

  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    redirect("/admin/cases");
  }

  const nextStatus = String(formData.get("status") ?? "");
  const nextUrgency = String(formData.get("urgency") ?? "");
  const nextDirection = String(formData.get("direction") ?? "");

  if (
    !includesValue(caseStatuses, nextStatus) ||
    !includesValue(caseUrgencies, nextUrgency) ||
    !includesValue(caseDirections, nextDirection)
  ) {
    redirectToCase(caseId, { error: "Недопустимое значение статуса кейса." });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    redirectToCase(caseId, {
      error: "Service role key не настроен — обновление недоступно."
    });
  }

  const { data: currentCase, error: lookupError } = await supabase
    .from("client_cases")
    .select("id, profile_id, status, urgency, direction")
    .eq("id", caseId)
    .maybeSingle();

  if (lookupError || !currentCase) {
    redirectToCase(caseId, { error: "Кейс не найден." });
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
    redirectToCase(caseId, { error: updateError.message });
  }

  await writeAuditLog({
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
  });

  if (currentCase.status !== nextStatus) {
    await writeLifecycleEvent({
      profileId: currentCase.profile_id,
      caseId,
      eventType: "status_changed",
      fromStatus: currentCase.status,
      toStatus: nextStatus,
      actorId: auth.userId,
      actorRole: auth.role
    });
  }

  redirectToCase(caseId, { notice: "case-updated" });
}

export async function recordCasePayment(formData: FormData): Promise<void> {
  const caseId = String(formData.get("caseId") ?? "");

  if (!uuidPattern.test(caseId)) {
    redirect("/admin/cases");
  }

  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    redirect("/admin/cases");
  }

  const product = String(formData.get("product") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim().replace(",", ".");
  const currency = String(formData.get("currency") ?? "USD")
    .trim()
    .toUpperCase();
  const processorReference = String(
    formData.get("processorReference") ?? ""
  ).trim();

  if (!includesValue(paymentProducts, product)) {
    redirectToCase(caseId, { error: "Выберите продукт оплаты." });
  }

  const amount = Number(amountRaw);

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    redirectToCase(caseId, { error: "Укажите корректную сумму оплаты." });
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    redirectToCase(caseId, { error: "Валюта указывается кодом из 3 букв, например USD." });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    redirectToCase(caseId, {
      error: "Service role key не настроен — запись оплаты недоступна."
    });
  }

  const { data: currentCase, error: lookupError } = await supabase
    .from("client_cases")
    .select("id, profile_id")
    .eq("id", caseId)
    .maybeSingle();

  if (lookupError || !currentCase) {
    redirectToCase(caseId, { error: "Кейс не найден." });
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
    redirectToCase(caseId, { error: paymentError.message });
  }

  await writeAuditLog({
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
  });

  await writeLifecycleEvent({
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
  });

  redirectToCase(caseId, { notice: "payment-recorded" });
}
