import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type DatabaseEvent = {
  type?: unknown;
  table?: unknown;
  schema?: unknown;
  record?: { id?: unknown } | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authorized(request: Request): boolean {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const supplied = request.headers.get("apikey")?.trim();

  if (!expected || !supplied) {
    return false;
  }

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);

  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function clean(value: string | null | undefined): string | null {
  const result = value?.trim();
  return result || null;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: DatabaseEvent;

  try {
    body = (await request.json()) as DatabaseEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const id = body.record?.id;
  const table = body.table;

  if (
    body.type !== "INSERT" ||
    body.schema !== "public" ||
    typeof id !== "string" ||
    !UUID_PATTERN.test(id) ||
    (table !== "profiles" && table !== "client_cases")
  ) {
    return NextResponse.json({ error: "Unsupported event" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (table === "profiles") {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, role")
      .eq("id", id)
      .maybeSingle();

    if (error || !profile || profile.role !== "client") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const result = await notifyTeam({
      kind: "new_registration",
      dedupeKey: `new-registration:${profile.id}`,
      title: "🆕 Новый пользователь зарегистрирован",
      lines: [
        clean(profile.full_name) ? `Имя: ${clean(profile.full_name)}` : "Имя пока не указано",
        clean(profile.email) ? `Email: ${clean(profile.email)}` : null,
        clean(profile.phone) ? `Телефон: ${clean(profile.phone)}` : null,
        "Источник: общая база (сайт или приложение)"
      ],
      link: adminLink("/admin/cases")
    });

    return NextResponse.json({ ok: true, result });
  }

  const { data: clientCase, error: caseError } = await supabase
    .from("client_cases")
    .select("id, profile_id, case_number, status")
    .eq("id", id)
    .maybeSingle();

  if (caseError || !clientCase) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, phone")
    .eq("id", clientCase.profile_id)
    .maybeSingle();

  const result = await notifyTeam({
    kind: "new_case",
    dedupeKey: `new-case:${clientCase.id}`,
    title: "📋 Создан новый клиентский кейс",
    lines: [
      clean(profile?.full_name) ? `Клиент: ${clean(profile?.full_name)}` : "Имя пока не указано",
      clean(profile?.email) ? `Email: ${clean(profile?.email)}` : null,
      clean(profile?.phone) ? `Телефон: ${clean(profile?.phone)}` : null,
      clean(clientCase.case_number) ? `Кейс: ${clean(clientCase.case_number)}` : `ID кейса: ${clientCase.id}`,
      `Статус: ${clientCase.status}`
    ],
    link: adminLink(`/admin/cases/${clientCase.id}`)
  });

  return NextResponse.json({ ok: true, result });
}
