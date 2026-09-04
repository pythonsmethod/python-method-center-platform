"use server";

import { revalidatePath } from "next/cache";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";
import { canSavePictureNote, type PictureNoteState } from "./review-policy";

export type PictureNoteActionState = { status: "idle" | "success" | "error"; message: string };

export async function saveCasePictureNote(_previous: PictureNoteActionState, formData: FormData): Promise<PictureNoteActionState> {
  const locale = formData.get("locale") === "en" ? "en" : "ru";
  const caseId = String(formData.get("case_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const state: PictureNoteState = formData.get("review_state") === "confirmed" ? "confirmed" : "draft";
  const auth = await getStaffUserState();
  const isStaff = auth.status === "authorized";
  const isKaren = isStaff && resolvePrivateAssistantRole(auth.email) === "karen";
  if (!canSavePictureNote({ isStaff, isKaren, state })) return { status: "error", message: locale === "ru" ? "Подтвердить замечание может только Карен." : "Only Karen can confirm a review note." };
  if (!isUuid(caseId) || !body || body.length > 4000) return { status: "error", message: locale === "ru" ? "Введите замечание длиной до 4000 знаков." : "Enter a note of up to 4,000 characters." };
  const supabase = createSupabaseServiceClient();
  if (!supabase || auth.status !== "authorized") return { status: "error", message: locale === "ru" ? "Хранилище заметок недоступно." : "The note store is unavailable." };
  const { data: clientCase } = await supabase.from("client_cases").select("id, profile_id").eq("id", caseId).maybeSingle();
  if (!clientCase) return { status: "error", message: locale === "ru" ? "Кейс не найден." : "Case not found." };
  const { error } = await supabase.from("admin_notes").insert({ case_id: caseId, profile_id: clientCase.profile_id, author_id: auth.userId, visibility: "karen_and_admin", body, metadata: { kind: "case_picture_review", state } });
  if (error) return { status: "error", message: locale === "ru" ? "Не удалось сохранить замечание." : "Could not save the note." };
  revalidatePath(`/admin/cases/${caseId}`);
  return { status: "success", message: state === "confirmed" ? (locale === "ru" ? "Замечание Карен сохранено как подтверждённое." : "Karen's note was saved as confirmed.") : (locale === "ru" ? "Черновик замечания сохранён." : "Review-note draft saved.") };
}
