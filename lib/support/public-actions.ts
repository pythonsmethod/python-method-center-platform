"use server";

import { headers } from "next/headers";
import type { SupportRequestActionState } from "@/lib/support/types";
import { validatePublicSupportInput } from "@/lib/support/validation";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { sendGuestSupportEmail } from "@/lib/notifications/guest-support-email";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { clientIp } from "@/lib/utils/client-ip";

// Best-effort per-instance limiter (mirrors the assistant endpoint):
// smooths bursts and bots; not a hard distributed cap.
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

// The form no longer asks the guest to pick a topic: the message itself says
// what it is about. Every guest request is filed under one subject.
const GUEST_SUBJECT = "Гость: обращение с сайта";

// Public guest support request: no account required. Writes to
// support_requests with profile_id = null and a reply-to contact_email.
export async function submitPublicSupportRequest(
  _previousState: SupportRequestActionState,
  formData: FormData
): Promise<SupportRequestActionState> {
  const en = formData.get("locale") === "en";
  const validation = validatePublicSupportInput({
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
    consent: formData.get("consent") === "on",
    honeypot: String(formData.get("website") ?? ""),
    locale: formData.get("locale") === "en" ? "en" : "ru"
  });

  if ("error" in validation) {
    return errorState(validation.error);
  }

  const clientKey = clientIp(await headers());

  if (isRateLimited(clientKey)) {
    return errorState(
      en ? "Too many requests. Wait a little and try again." : "Слишком много обращений подряд. Подождите немного и попробуйте ещё раз."
    );
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState(
      en ? "The service is temporarily unavailable. Email us using the address below." : "Сервис временно недоступен. Напишите нам на email, указанный ниже."
    );
  }

  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const { data: request, error: insertError } = await supabase
    .from("support_requests")
    .insert({
      profile_id: null,
      category: "other",
      subject: GUEST_SUBJECT,
      body: message,
      contact_name: validation.contactName,
      contact_email: email,
      contact_phone: phone
    })
    .select("id")
    .single();

  if (insertError) {
    return errorState(
      en ? "The message could not be sent. Try again in a minute." : "Не удалось отправить сообщение. Попробуйте ещё раз через минуту."
    );
  }

  const requestLink = adminLink(`/admin/requests#request-${request.id}`);

  await Promise.all([notifyTeam({
    kind: "support_request",
    dedupeKey: `support_request:${request.id}`,
    title: "📨 Новое обращение с сайта (гость)",
    lines: [
            `Имя: ${validation.contactName}`,
      `Ответить на: ${email}`,
      `Телефон: ${phone}`,
      "Откройте раздел «Обращения», чтобы прочитать."
    ],
    link: requestLink
  }), sendGuestSupportEmail({
    requestId: request.id,
    subject: GUEST_SUBJECT,
    guestName: validation.contactName,
    guestEmail: email,
    guestPhone: phone,
    message,
    link: requestLink
  })]);

  return {
    status: "success",
    message: en
      ? "Your message has been sent. We will reply to the provided email within 24 hours on business days."
      : "Сообщение отправлено. Мы ответим на указанный email в течение 24 часов (в рабочие дни)."
  };
}
