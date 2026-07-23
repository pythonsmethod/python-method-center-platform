import { NextResponse } from "next/server";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { CASE_AUDIO_BUCKET } from "@/lib/messages/queries";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

const allowedTypes: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav"
};

function extensionFor(mimeType: string): string | null {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return allowedTypes[base] ?? null;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();
  const authClient = await createSupabaseServerClient();

  if (!supabase || !authClient) {
    return NextResponse.json({ error: "Сервис временно недоступен." }, { status: 503 });
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const file = form.get("audio");
  const rawDuration = Number(form.get("duration") ?? 0);

  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Аудио не получено." }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Голосовое слишком длинное (максимум ~10 МБ)." },
      { status: 413 }
    );
  }

  const extension = extensionFor(file.type);

  if (!extension) {
    return NextResponse.json({ error: "Неподдерживаемый формат аудио." }, { status: 415 });
  }

  // Resolve sender: staff sends into an explicit case, a client into their own.
  const staff = await getStaffUserState();
  let caseId: string;
  let profileId: string;
  let senderId: string;
  let senderRole: string;

  if (staff.status === "authorized") {
    const requestedCaseId = String(form.get("caseId") ?? "");

    if (!isUuid(requestedCaseId)) {
      return NextResponse.json({ error: "Некорректный кейс." }, { status: 400 });
    }

    const { data: caseRow } = await supabase
      .from("client_cases")
      .select("id, profile_id")
      .eq("id", requestedCaseId)
      .maybeSingle();

    if (!caseRow) {
      return NextResponse.json({ error: "Кейс не найден." }, { status: 404 });
    }

    caseId = caseRow.id;
    profileId = caseRow.profile_id;
    senderId = staff.userId;
    senderRole = staff.role;
  } else {
    const {
      data: { user }
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    }

    const { data: caseRow } = await supabase
      .from("client_cases")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!caseRow) {
      return NextResponse.json(
        { error: "Сначала заполните анкету — она создаст ваш кейс." },
        { status: 400 }
      );
    }

    caseId = caseRow.id;
    profileId = user.id;
    senderId = user.id;
    senderRole = "client";
  }

  const audioPath = `${caseId}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CASE_AUDIO_BUCKET)
    .upload(audioPath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `Не удалось сохранить аудио: ${uploadError.message}` },
      { status: 502 }
    );
  }

  const duration =
    Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 3600
      ? Math.round(rawDuration)
      : null;

  const { data: message, error: insertError } = await supabase
    .from("case_messages")
    .insert({
      case_id: caseId,
      profile_id: profileId,
      sender_id: senderId,
      sender_role: senderRole,
      audio_path: audioPath,
      audio_duration_seconds: duration
    })
    .select("id")
    .single();

  if (insertError || !message) {
    await supabase.storage.from(CASE_AUDIO_BUCKET).remove([audioPath]);

    return NextResponse.json(
      { error: `Не удалось отправить сообщение: ${insertError?.message ?? "ошибка"}` },
      { status: 502 }
    );
  }

  if (senderRole === "client") {
    await notifyTeam({
      kind: "client_message",
      dedupeKey: `client_message:${message.id}`,
      title: "🎙 Новое голосовое от клиента",
      lines: [
        `Кейс: ${caseId}`,
        "Откройте чат кейса, чтобы прослушать и ответить."
      ],
      link: adminLink(`/admin/cases/${caseId}`)
    });
  }

  return NextResponse.json({ ok: true });
}
