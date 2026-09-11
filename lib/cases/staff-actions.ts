"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { PAYMENT_PRODUCTS, includesValue } from "@/lib/cases/constants";
import { getLocale } from "@/lib/i18n/locale";
import { writeLifecycleEvent } from "@/lib/cases/lifecycle";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { openServicePeriod } from "@/lib/payments/service-period";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { awardReferralTokensForPayment } from "@/lib/tokens/award";
import { isUuid } from "@/lib/utils/uuid";

const amountPattern = /^\d{1,7}(?:[.,]\d{1,2})?$/;
// Kept as a hard server-side guard while older browser tabs may still hold
// the previous form's action identifier. New payments must come from the
// payment processor webhook, never from an admin-entered amount.
const MANUAL_PAYMENT_ENTRY_ENABLED = false;

function errorState(message: string): StaffActionState {
  return { status: "error", message };
}

function successState(message: string): StaffActionState {
  return { status: "success", message };
}

// Retired with the client processing classification.
//
// Client cases have no processing status, urgency, prioritisation, badge or
// filter, so there is nothing here left to set. The function survives only as
// a closed door: a browser tab opened before the release still holds the old
// form's action identifier, and a POST from it must not reach the database.
//
// It therefore reads nothing and writes nothing — no lookup, no update, no
// audit row, no lifecycle event. Existing classification transitions already
// in audit storage stay exactly as they are; they are history, not a control.
//
// `docs/architecture/CLIENT_PROCESSING_WITHOUT_CLASSIFICATION.md` is
// authoritative. Do not restore this action.
export async function updateCaseState(
  _previousState: StaffActionState,
  _formData: FormData
): Promise<StaffActionState> {
  const locale = await getLocale();

  return errorState(
    locale === "en"
      ? "Case status, urgency and direction were retired and can no longer be changed. Refresh the page to see the current case."
      : "Статус, срочность и направление кейса больше не используются и не могут быть изменены. Обновите страницу, чтобы увидеть актуальный кейс."
  );
}

export async function recordCasePayment(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  if (!MANUAL_PAYMENT_ENTRY_ENABLED) {
    return errorState(
      "Ручная запись оплаты отключена. Оплаты появляются автоматически после подтверждения платёжной системой."
    );
  }

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
  const paidAt = new Date();

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
      paid_at: paidAt.toISOString(),
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

  // Recording the money is not the same as switching the plan on, and this
  // form used to do only the first. Someone who paid by transfer or in
  // crypto — which is everyone whose card cannot leave their country —
  // appeared as paid in the case and still had no access. Nothing said so.
  const period = await openServicePeriod(supabase, {
    profileId: currentCase.profile_id,
    caseId,
    paymentId: payment.id,
    product,
    paidAt
  });

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
        currency,
        service_period: period.status
      }
    }),
    // The referrer earns their tokens whether the client paid by card or by
    // transfer. Rewarding only card payments would punish people for the
    // country their friend happens to live in.
    awardReferralTokensForPayment({
      payerProfileId: currentCase.profile_id,
      paymentId: payment.id,
      amountCents
    })
  ]);

  revalidatePath(`/admin/cases/${caseId}`);
  // The client is looking at their own cabinet while this happens.
  revalidatePath("/cabinet");

  // Say which of the two things happened, because they are not the same and
  // the difference decides whether anyone has to do anything next.
  if (period.status === "failed") {
    return errorState(
      `Оплата записана, но тариф НЕ включён: ${period.message}. Клиент доступ не получил — откройте период вручную или напишите разработчику.`
    );
  }

  if (period.status === "not-applicable") {
    return successState(
      "Оплата зафиксирована. Тариф не включался: у этого формата нет периода сопровождения."
    );
  }

  const until = new Date(period.endsAt).toLocaleDateString("ru-RU");

  return successState(
    period.status === "extended"
      ? `Оплата зафиксирована, сопровождение продлено до ${until}.`
      : `Оплата зафиксирована, тариф включён до ${until}. Клиент уже видит доступ.`
  );
}
