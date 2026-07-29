"use server";

import { headers } from "next/headers";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import {
  altPaymentMethodLabels,
  altPaymentPlanLabels,
  validateAltPaymentInput
} from "@/lib/payments/alt-validation";
import type { SupportRequestActionState } from "@/lib/support/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const hits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (hits.size > 5000) {
    hits.clear();
  }

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

function errorState(message: string): SupportRequestActionState {
  return { status: "error", message };
}

// A request for a payment method other than a card. Written into the same
// support queue the team already watches, so nothing new has to be
// monitored — and marked clearly enough to be answered first: this is a
// person who is ready to pay and cannot.
export async function submitAltPaymentRequest(
  _previousState: SupportRequestActionState,
  formData: FormData
): Promise<SupportRequestActionState> {
  const validation = validateAltPaymentInput({
    email: String(formData.get("email") ?? ""),
    country: String(formData.get("country") ?? ""),
    plan: String(formData.get("plan") ?? ""),
    method: String(formData.get("method") ?? ""),
    comment: String(formData.get("comment") ?? ""),
    consent: formData.get("consent") === "on",
    honeypot: String(formData.get("website") ?? "")
  });

  if ("error" in validation) {
    return errorState(validation.error);
  }

  const headerStore = await headers();
  const clientKey =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(clientKey)) {
    return errorState(
      "Слишком много запросов подряд. Подождите немного и попробуйте ещё раз."
    );
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState(
      "Сервис временно недоступен. Напишите нам через страницу «Поддержка»."
    );
  }

  // Attach the request to the account when the person is signed in, so the
  // team answers inside their case instead of by email.
  let profileId: string | null = null;

  try {
    const auth = await createSupabaseServerClient();

    if (auth) {
      const {
        data: { user }
      } = await auth.auth.getUser();

      profileId = user?.id ?? null;
    }
  } catch {
    profileId = null;
  }

  const body = [
    `Страна: ${validation.country}`,
    `Тариф: ${altPaymentPlanLabels[validation.plan]}`,
    `Удобный способ: ${altPaymentMethodLabels[validation.method]}`,
    validation.comment ? `Комментарий: ${validation.comment}` : null
  ]
    .filter(Boolean)
    .join("\n");

  const { data: request, error: insertError } = await supabase
    .from("support_requests")
    .insert({
      profile_id: profileId,
      category: "payment",
      status: "open",
      subject: "ОПЛАТА: нужен способ помимо карты",
      body,
      contact_email: validation.email
    })
    .select("id")
    .single();

  if (insertError) {
    return errorState(
      "Не удалось отправить запрос. Попробуйте ещё раз через минуту."
    );
  }

  await notifyTeam({
    kind: "support_request",
    dedupeKey: `alt_payment_request:${request.id}`,
    title: "💳 ЧЕЛОВЕК ГОТОВ ПЛАТИТЬ — нужен другой способ оплаты",
    lines: [
      `Страна: ${validation.country}`,
      `Тариф: ${altPaymentPlanLabels[validation.plan]}`,
      `Способ: ${altPaymentMethodLabels[validation.method]}`,
      `Ответить на: ${validation.email}`,
      validation.comment ? `Комментарий: ${validation.comment}` : null,
      "Отвечать в первую очередь: этот человек уже принял решение."
    ],
    link: adminLink("/admin/requests")
  });

  return {
    status: "success",
    message:
      "Запрос отправлен. Мы пришлём реквизиты на указанный email в течение 24 часов (в рабочие дни). Если способ из вашей страны нам недоступен — честно напишем об этом и предложим другой."
  };
}
