import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit/log";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { SUPPORT_AUDIO_BUCKET } from "@/lib/support/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

export const runtime = "nodejs";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "audio/webm": "webm", "audio/mp4": "m4a", "audio/mpeg": "mp3",
  "audio/ogg": "ogg", "audio/wav": "wav"
};

export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();
  const authClient = await createSupabaseServerClient();
  if (!supabase || !authClient) return NextResponse.json({ error: "Сервис временно недоступен." }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 }); }

  const locale = String(form.get("locale")) === "en" ? "en" : "ru";
  const text = (ru: string, en: string) => locale === "en" ? en : ru;
  const requestId = String(form.get("requestId") ?? "");
  const file = form.get("audio");
  const rawDuration = Number(form.get("duration") ?? 0);
  if (!isUuid(requestId)) return NextResponse.json({ error: text("Некорректное обращение.", "Invalid support request.") }, { status: 400 });
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: text("Аудио не получено.", "No audio was received.") }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: text("Голосовое слишком большое (максимум 10 МБ).", "The voice message is too large (10 MB maximum).") }, { status: 413 });
  const baseType = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  const extension = allowedTypes[baseType];
  if (!extension) return NextResponse.json({ error: text("Неподдерживаемый формат аудио.", "Unsupported audio format.") }, { status: 415 });

  const { data: supportRequest } = await supabase.from("support_requests")
    .select("id, profile_id, case_id, subject").eq("id", requestId).maybeSingle();
  if (!supportRequest?.profile_id) return NextResponse.json({ error: text("Обращение не найдено.", "Support request not found.") }, { status: 404 });

  const staff = await getStaffUserState();
  let senderId: string;
  let senderRole: "client" | "karen" | "support" | "admin";
  if (staff.status === "authorized") {
    senderId = staff.userId;
    senderRole = staff.role;
  } else {
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: text("Войдите в аккаунт.", "Sign in to your account.") }, { status: 401 });
    if (supportRequest.profile_id !== user.id) return NextResponse.json({ error: text("Нет доступа.", "Access denied.") }, { status: 403 });
    senderId = user.id;
    senderRole = "client";
  }

  const audioPath = `${requestId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(SUPPORT_AUDIO_BUCKET)
    .upload(audioPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: text("Не удалось сохранить аудио.", "The audio could not be saved.") }, { status: 502 });

  const duration = Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 3600 ? Math.round(rawDuration) : null;
  const { data: message, error } = await supabase.from("support_request_messages").insert({
    support_request_id: requestId, profile_id: supportRequest.profile_id,
    sender_id: senderId, sender_role: senderRole, audio_path: audioPath,
    audio_duration_seconds: duration
  }).select("id").single();
  if (error || !message) {
    await supabase.storage.from(SUPPORT_AUDIO_BUCKET).remove([audioPath]);
    return NextResponse.json({ error: text("Не удалось отправить голосовое сообщение.", "The voice message could not be sent.") }, { status: 502 });
  }

  await writeAuditLog({ profileId: supportRequest.profile_id, caseId: supportRequest.case_id,
    actorId: senderId, actorRole: senderRole, action: "support_voice_message_created",
    entityTable: "support_request_messages", entityId: message.id });
  if (senderRole === "client") await notifyTeam({ kind: "support_request",
    dedupeKey: `support_voice_message:${message.id}`, title: "🎙 Новое голосовое в обращении",
    lines: [`Тема: ${supportRequest.subject.slice(0, 120)}`, "Откройте обращение, чтобы прослушать и ответить."],
    link: adminLink(`/admin/requests#request-${requestId}`) });
  return NextResponse.json({ ok: true });
}
