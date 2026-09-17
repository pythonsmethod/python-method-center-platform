import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ClientMessageChannel = "support" | "professor";
export type ClientMessageEmailResult = "sent" | "duplicate" | "skipped" | "failed";

type ClientMessageEmailInput = { profileId: string; messageId: string; channel: ClientMessageChannel };

const emailCopy = {
  ru: {
    subject: "Новое сообщение в Python Method Center",
    intro: { support: "В вашем личном кабинете появилось новое сообщение от службы поддержки.", professor: "В вашем личном кабинете появилось новое сообщение от Professor Python." },
    action: "Открыть сообщение",
    note: "Содержание сообщения доступно только после входа в защищённый личный кабинет."
  },
  en: {
    subject: "New message in Python Method Center",
    intro: { support: "You have a new message from Support in your account.", professor: "You have a new message from Professor Python in your account." },
    action: "Open message",
    note: "The message content is available only after you sign in to your secure account."
  }
} as const;

function accountLink(channel: ClientMessageChannel): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://pythonmethodcenter.com";
  return `${base}${channel === "support" ? "/cabinet/chat" : "/cabinet/dialog"}`;
}

export function buildClientMessageEmail(channel: ClientMessageChannel, locale: "ru" | "en") {
  const copy = emailCopy[locale];
  const link = accountLink(channel);
  return {
    subject: copy.subject,
    text: [copy.intro[channel], "", `${copy.action}: ${link}`, "", copy.note].join("\n"),
    link
  };
}

export async function sendClientMessageEmail(input: ClientMessageEmailInput): Promise<ClientMessageEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SUPPORT_FROM_EMAIL?.trim();
  const supabase = createSupabaseServiceClient();
  if (!supabase) return "failed";

  const { data: profile, error: profileError } = await supabase.from("profiles").select("email, locale").eq("id", input.profileId).maybeSingle();
  const email = profile?.email?.trim();

  const dedupeKey = `client_email:${input.channel}:${input.messageId}`;
  const { data: event, error: eventError } = await supabase.from("notification_events").insert({
    kind: "client_message",
    dedupe_key: dedupeKey,
    status: "pending",
    payload: { channel: input.channel }
  }).select("id").single();

  if (eventError) {
    if (eventError.code === "23505") return "duplicate";
    console.error("sendClientMessageEmail: log insert failed", eventError.message);
    return "failed";
  }

  if (!apiKey || !from) {
    await supabase.from("notification_events").update({ status: "skipped", last_error: "email-not-configured" }).eq("id", event.id);
    return "skipped";
  }

  if (profileError || !email) {
    await supabase.from("notification_events").update({
      status: "skipped",
      last_error: profileError ? "recipient-query-failed" : "recipient-email-missing"
    }).eq("id", event.id);
    return "skipped";
  }

  const locale = profile?.locale === "en" ? "en" : "ru";
  const content = buildClientMessageEmail(input.channel, locale);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": dedupeKey },
      body: JSON.stringify({ from, to: [email], subject: content.subject, text: content.text })
    });
    await supabase.from("notification_events").update({
      status: response.ok ? "sent" : "failed",
      attempts: 1,
      last_error: response.ok ? null : `resend-http-${response.status}`
    }).eq("id", event.id);
    return response.ok ? "sent" : "failed";
  } catch (error) {
    await supabase.from("notification_events").update({
      status: "failed",
      attempts: 1,
      last_error: error instanceof Error ? error.message.slice(0, 500) : "unknown-error"
    }).eq("id", event.id);
    return "failed";
  }
}
