import { NextResponse } from "next/server";
import { CASE_AUDIO_BUCKET } from "@/lib/messages/queries";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const allowedTypes: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav"
};

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

function extensionFor(mimeType: string): string | null {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return allowedTypes[base] ?? null;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();
  const token = bearerToken(request);
  if (!supabase) return NextResponse.json({ error: "Сервис недоступен." }, { status: 503 });
  if (!token) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });

  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });

  const { data: caseRow } = await supabase
    .from("client_cases")
    .select("id")
    .eq("profile_id", auth.user.id)
    .maybeSingle();
  if (!caseRow) return NextResponse.json({ error: "Сначала заполните анкету." }, { status: 409 });

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
    return NextResponse.json({ error: "Голосовое сообщение слишком большое." }, { status: 413 });
  }

  const extension = extensionFor(file.type || "audio/mp4");
  if (!extension) return NextResponse.json({ error: "Неподдерживаемый формат аудио." }, { status: 415 });

  const audioPath = `${caseRow.id}/${crypto.randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(CASE_AUDIO_BUCKET)
    .upload(audioPath, bytes, { contentType: file.type || "audio/mp4", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 502 });
  }

  const duration = Number.isFinite(rawDuration) && rawDuration > 0 && rawDuration <= 3600
    ? Math.round(rawDuration)
    : null;

  const { data: message, error: insertError } = await supabase
    .from("case_messages")
    .insert({
      case_id: caseRow.id,
      profile_id: auth.user.id,
      sender_id: auth.user.id,
      sender_role: "client",
      audio_path: audioPath,
      audio_duration_seconds: duration
    })
    .select("id, sender_role, body, audio_path, audio_duration_seconds, created_at, read_at")
    .single();

  if (insertError || !message) {
    await supabase.storage.from(CASE_AUDIO_BUCKET).remove([audioPath]);
    return NextResponse.json({ error: insertError?.message ?? "Не удалось отправить голосовое." }, { status: 502 });
  }

  await notifyTeam({
    kind: "client_message",
    dedupeKey: `client_message:${message.id}`,
    title: "🎙 Новое голосовое от клиента",
    lines: [`Кейс: ${caseRow.id}`, "Откройте чат кейса, чтобы прослушать сообщение."],
    link: adminLink(`/admin/cases/${caseRow.id}`)
  });

  return NextResponse.json({ message }, { status: 201 });
}
