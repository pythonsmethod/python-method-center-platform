import { PRIMARY_FOUNDER_EMAIL } from "@/lib/auth/require-founder";
import { karenAllowlist, resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type StaffMessageAudience = "anna_support" | "karen_professor";
export type StaffMessageEmailResult = "sent" | "duplicate" | "skipped" | "failed";

type StaffMessageEmailInput = {
  audience: StaffMessageAudience;
  eventId: string;
  link: string;
};

export function staffMessageRecipients(audience: StaffMessageAudience): string[] {
  if (audience === "anna_support") return [PRIMARY_FOUNDER_EMAIL];
  return [...new Set(karenAllowlist().filter((email) => resolvePrivateAssistantRole(email) === "karen"))];
}

export function buildStaffMessageEmail(audience: StaffMessageAudience, link: string) {
  const support = audience === "anna_support";
  return {
    subject: support ? "Новое сообщение в службе поддержки" : "Новое сообщение в переписке Professor Python",
    text: [
      support
        ? "Клиент написал новое сообщение в службу поддержки."
        : "Клиент написал новое сообщение в личную переписку Professor Python.",
      "",
      `Открыть защищённую переписку: ${link}`,
      "",
      "Текст сообщения и данные клиента доступны только после входа в рабочий кабинет."
    ].join("\n")
  };
}

async function deliverStaffMessageEmail(input: StaffMessageEmailInput): Promise<StaffMessageEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SUPPORT_FROM_EMAIL?.trim();
  const recipients = staffMessageRecipients(input.audience);
  const supabase = createSupabaseServiceClient();
  if (!supabase) return "failed";

  const dedupeKey = `staff_email:${input.audience}:${input.eventId}`;
  const { data: event, error: eventError } = await supabase.from("notification_events").insert({
    kind: "client_message",
    dedupe_key: dedupeKey,
    status: "pending",
    payload: { audience: input.audience }
  }).select("id").single();
  if (eventError) {
    if (eventError.code === "23505") return "duplicate";
    console.error("sendStaffMessageEmail: log insert failed", eventError.message);
    return "failed";
  }

  if (!apiKey || !from || recipients.length === 0) {
    await supabase.from("notification_events").update({
      status: "skipped",
      last_error: !apiKey || !from ? "email-not-configured" : "recipient-email-missing"
    }).eq("id", event.id);
    return "skipped";
  }

  const content = buildStaffMessageEmail(input.audience, input.link);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": dedupeKey },
      body: JSON.stringify({ from, to: recipients, subject: content.subject, text: content.text })
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

export async function sendStaffMessageEmail(input: StaffMessageEmailInput): Promise<StaffMessageEmailResult> {
  try {
    return await deliverStaffMessageEmail(input);
  } catch (error) {
    console.error("sendStaffMessageEmail: unexpected failure", error instanceof Error ? error.message : "unknown-error");
    return "failed";
  }
}
