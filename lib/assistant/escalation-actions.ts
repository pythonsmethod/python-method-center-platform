"use server";

import { revalidatePath } from "next/cache";
import { getFounderState } from "@/lib/auth/require-founder";
import { markGapRead, markGapUnread } from "@/lib/assistant/escalation-store";
import { notificationsCopy } from "@/lib/assistant/escalation-copy";
import { getLocale } from "@/lib/i18n/locale";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { isUuid } from "@/lib/utils/uuid";

// Read and unread, for one founder.
//
// Authorisation is re-checked here rather than trusted from the page that
// rendered the button: a server action is a public endpoint, and the founder
// gate on the page does not travel with the request. The founder's own
// profile id comes from the session, never from the form, so one founder
// cannot mark an event read on another's behalf.

async function setReadState(
  formData: FormData,
  next: "read" | "unread"
): Promise<StaffActionState> {
  const locale = await getLocale();
  const copy = notificationsCopy(locale);
  const auth = await getFounderState();

  if (auth.status !== "authorized") {
    return { status: "error", message: copy.accessText };
  }

  const eventId = String(formData.get("eventId") ?? "");

  if (!isUuid(eventId)) {
    return { status: "error", message: copy.notFound };
  }

  const ok = next === "read"
    ? await markGapRead(eventId, auth.userId)
    : await markGapUnread(eventId, auth.userId);

  if (!ok) {
    return { status: "error", message: copy.actionFailed };
  }

  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/notifications/${eventId}`);
  revalidatePath("/admin");

  return {
    status: "success",
    message: next === "read" ? copy.read : copy.unread
  };
}

export async function markGapEventRead(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  return setReadState(formData, "read");
}

export async function markGapEventUnread(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  return setReadState(formData, "unread");
}
