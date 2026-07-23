import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { buildNotificationText } from "@/lib/notifications/format";
import {
  isTelegramConfigured,
  sendTelegramMessage
} from "@/lib/notifications/telegram";

export type NotificationKind =
  | "red_flag"
  | "client_message"
  | "support_request"
  | "payment"
  | "processing_error";

export type NotifyTeamInput = {
  kind: NotificationKind;
  // Stable key per source event: the same event never notifies twice, even
  // if the caller runs again (webhook redelivery, retried action).
  dedupeKey: string;
  title: string;
  lines: Array<string | null | undefined>;
  link?: string | null;
};

export type NotifyTeamResult =
  | "sent"
  | "duplicate"
  | "skipped"
  | "failed"
  | "log-unavailable";

// Fire-and-forget team notification. Never throws: a notification failure
// must not break the user-facing flow that triggered it. Delivery status,
// attempts and errors are recorded in notification_events.
export async function notifyTeam(
  input: NotifyTeamInput
): Promise<NotifyTeamResult> {
  try {
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      // No service role — still try to deliver, just without the log.
      if (isTelegramConfigured()) {
        const direct = await sendTelegramMessage(
          buildNotificationText(input)
        );
        return direct.ok ? "sent" : "failed";
      }
      return "log-unavailable";
    }

    const { data: row, error: insertError } = await supabase
      .from("notification_events")
      .insert({
        kind: input.kind,
        dedupe_key: input.dedupeKey,
        status: "pending",
        payload: { title: input.title, link: input.link ?? null }
      })
      .select("id")
      .single();

    if (insertError) {
      // 23505 = unique violation: this event was already handled.
      if (insertError.code === "23505") {
        return "duplicate";
      }
      console.error("notifyTeam: log insert failed", insertError.message);
      return "log-unavailable";
    }

    if (!isTelegramConfigured()) {
      await supabase
        .from("notification_events")
        .update({ status: "skipped", last_error: "telegram-not-configured" })
        .eq("id", row.id);
      return "skipped";
    }

    const result = await sendTelegramMessage(buildNotificationText(input));

    await supabase
      .from("notification_events")
      .update({
        status: result.ok ? "sent" : "failed",
        attempts: result.attempts,
        last_error: result.ok ? null : result.error
      })
      .eq("id", row.id);

    return result.ok ? "sent" : "failed";
  } catch (error) {
    console.error(
      "notifyTeam: unexpected failure",
      error instanceof Error ? error.message : error
    );
    return "failed";
  }
}

export function adminLink(path: string = "/admin"): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://pythonmethodcenter.com";

  return `${base}${path}`;
}
