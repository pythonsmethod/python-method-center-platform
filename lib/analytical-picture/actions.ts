"use server";

import { revalidatePath } from "next/cache";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";
import { canSavePictureNote, type PictureNoteState } from "./review-policy";
import { getCaseAnalyticalPicture } from "./queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewSnapshotToken } from "./review-snapshot";

export type PictureNoteActionState = { status: "idle" | "success" | "error"; message: string };

export async function saveEvidenceReview(_previous: PictureNoteActionState, formData: FormData): Promise<PictureNoteActionState> {
  const locale = formData.get("locale") === "en" ? "en" : "ru";
  const caseId = String(formData.get("case_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const evidenceId = String(formData.get("evidence_id") ?? "");
  const expectedToken = String(formData.get("review_token") ?? "");
  const requestedDecision = String(formData.get("decision") ?? "");
  const correction = String(formData.get("correction") ?? "").trim();
  const decision = requestedDecision === "CONFIRMED" || requestedDecision === "CORRECTED" || requestedDecision === "REJECTED" ? requestedDecision : null;
  const auth = await getStaffUserState();
  const session = await createSupabaseServerClient();
  const verifiedUser = session ? await session.auth.getUser() : null;
  if (auth.status !== "authorized" || verifiedUser?.error || !verifiedUser?.data.user || verifiedUser.data.user.id !== auth.userId || resolvePrivateAssistantRole(verifiedUser.data.user.email ?? null) !== "karen") return { status: "error", message: locale === "ru" ? "Решение по свидетельству может сохранить только Карен." : "Only Karen can save an evidence decision." };
  if (!isUuid(caseId) || !isUuid(documentId) || !evidenceId || evidenceId.length > 200 || !decision) return { status: "error", message: locale === "ru" ? "Некорректное решение по свидетельству." : "Invalid evidence decision." };
  if (decision === "CORRECTED" && (!correction || correction.length > 2000)) return { status: "error", message: locale === "ru" ? "Для исправления укажите текст до 2000 знаков." : "Enter corrected text of up to 2,000 characters." };
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { status: "error", message: locale === "ru" ? "Хранилище решений недоступно." : "The decision store is unavailable." };
  const [{ data: clientCase, error: caseError }, { data: document, error: documentError }, pictureResult] = await Promise.all([
    supabase.from("client_cases").select("id, profile_id").eq("id", caseId).maybeSingle(),
    supabase.from("uploaded_documents").select("id").eq("id", documentId).eq("case_id", caseId).maybeSingle(),
    getCaseAnalyticalPicture(caseId),
  ]);
  if (caseError || documentError || !clientCase || !document || pictureResult.status !== "ready" || !pictureResult.picture.extractedEvidence.some((item) => item.id === evidenceId && item.documentId === documentId)) {
    return { status: "error", message: locale === "ru" ? "Свидетельство не найдено в этом кейсе." : "Evidence was not found in this case." };
  }
  const evidence = pictureResult.picture.extractedEvidence.find(item => item.id === evidenceId && item.documentId === documentId)!;
  const snapshot = evidence.reviewSnapshot;
  if (!snapshot || !/^[a-f0-9]{64}$/.test(expectedToken) || expectedToken !== reviewSnapshotToken(snapshot, evidenceId)) {
    return { status: "error", message: locale === "ru" ? "Данные изменились. Обновите страницу и сверьте строку ещё раз." : "The data changed. Refresh the page and review the row again." };
  }
  const { data: noteId, error } = await supabase.rpc("save_pmc_evidence_review", {
    p_case_id: caseId, p_document_id: documentId, p_actor: auth.userId,
    p_evidence_id: evidenceId, p_snapshot: snapshot, p_token: expectedToken,
    p_decision: decision, p_correction: decision === "CORRECTED" ? correction : null
  });

  if (error || !noteId) return { status: "error", message: locale === "ru" ? "Не удалось сохранить решение: проверьте, не изменились ли данные." : "Could not save the decision: check whether the data changed." };
  const readback = await supabase.from("admin_notes").select("id,metadata").eq("id", noteId).eq("case_id", caseId).maybeSingle();
  if (readback.error || readback.data?.metadata?.snapshot_token !== expectedToken) return { status: "error", message: locale === "ru" ? "Сохранение не подтверждено. Обновите страницу." : "Save readback failed. Reload the page." };
  revalidatePath(`/admin/cases/${caseId}`);
  return { status: "success", message: locale === "ru" ? "Решение Карен сохранено." : "Karen's decision was saved." };
}

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
