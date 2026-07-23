"use server";

import { headers } from "next/headers";
import type { SupportRequestActionState } from "@/lib/support/types";
import { validatePublicSupportInput } from "@/lib/support/validation";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

const categorySubjects: Record<string, string> = {
  login: "Гость: проблема со входом",
  payment: "Гость: вопрос по оплате",
  technical: "Гость: технический вопрос",
  other: "Гость: другой вопрос"
};

// Public guest support request: no account required. Writes to
// support_requests with profile_id = null and a reply-to contact_email.
export async function submitPublicSupportRequest(
  _previousState: SupportRequestActionState,
  formData: FormData
): Promise<SupportRequestActionState> {
  const validation = validatePublicSupportInput({
    email: String(formData.get("email") ?? ""),
    category: String(formData.get("category") ?? ""),
    message: String(formData.get("message") ?? ""),
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
      "Слишком много обращений подряд. Подождите немного и попробуйте ещё раз."
    );
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return errorState(
      "Сервис временно недоступен. Напишите нам на email, указанный ниже."
    );
  }

  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const { data: request, error: insertError } = await supabase
    .from("support_requests")
    .insert({
      profile_id: null,
      category:
        validation.category === "payment" ? "payment" : "technical",
      status: "open",
      subject: categorySubjects[validation.category],
      body: message,
      contact_email: email
    })
    .select("id")
    .single();

  if (insertError) {
    return errorState(
      "Не удалось отправить сообщение. Попробуйте ещё раз через минуту."
    );
  }

  await notifyTeam({
    kind: "support_request",
    dedupeKey: `support_request:${request.id}`,
    title: "📨 Новое обращение с сайта (гость)",
    lines: [
      `Тема: ${categorySubjects[validation.category]}`,
      `Ответить на: ${email}`,
      "Откройте раздел «Обращения», чтобы прочитать."
    ],
    link: adminLink("/admin/requests")
  });

  return {
    status: "success",
    message:
      "Сообщение отправлено. Мы ответим на указанный email в течение 24 часов (в рабочие дни)."
  };
}
