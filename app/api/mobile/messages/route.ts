import { NextResponse } from "next/server";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function bearerToken(request: Request): string | null {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

async function resolveMobileClient(request: Request) {
  const supabase = createSupabaseServiceClient();
  const token = bearerToken(request);

  if (!supabase || !token) return { supabase, user: null, caseRow: null };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return { supabase, user: null, caseRow: null };

  const { data: caseRow } = await supabase
    .from("client_cases")
    .select("id, profile_id")
    .eq("profile_id", data.user.id)
    .maybeSingle();

  return { supabase, user: data.user, caseRow };
}

export async function GET(request: Request) {
  const { supabase, user, caseRow } = await resolveMobileClient(request);

  if (!supabase) return NextResponse.json({ error: "Сервис недоступен." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  if (!caseRow) return NextResponse.json({ messages: [], unread: 0 });

  await supabase
    .from("case_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("case_id", caseRow.id)
    .neq("sender_role", "client")
    .is("read_at", null);

  const { data, error } = await supabase
    .from("case_messages")
    .select("id, sender_role, body, audio_path, audio_duration_seconds, created_at, read_at")
    .eq("case_id", caseRow.id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ messages: data ?? [], unread: 0 });
}

export async function POST(request: Request) {
  const { supabase, user, caseRow } = await resolveMobileClient(request);

  if (!supabase) return NextResponse.json({ error: "Сервис недоступен." }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  if (!caseRow) return NextResponse.json({ error: "Сначала заполните анкету." }, { status: 409 });

  let payload: { body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!body || body.length > 8000) {
    return NextResponse.json({ error: "Введите сообщение до 8000 символов." }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("case_messages")
    .insert({
      case_id: caseRow.id,
      profile_id: user.id,
      sender_id: user.id,
      sender_role: "client",
      body
    })
    .select("id, sender_role, body, audio_path, audio_duration_seconds, created_at, read_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  await notifyTeam({
    kind: "client_message",
    dedupeKey: `client_message:${message.id}`,
    title: "✉️ Новое сообщение от клиента",
    lines: [
      `Клиент: ${user.email ?? user.id}`,
      `Кейс: ${caseRow.id}`,
      "Откройте чат кейса, чтобы прочитать и ответить."
    ],
    link: adminLink(`/admin/cases/${caseRow.id}`)
  });

  return NextResponse.json({ message }, { status: 201 });
}
