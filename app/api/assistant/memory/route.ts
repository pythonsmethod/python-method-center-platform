import { NextResponse } from "next/server";
import { sanitizeChatMessages } from "@/lib/assistant/claude";
import { audienceForMemory, buildApprovedMemory, isMemoryCollection } from "@/lib/assistant/memory";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await getStaffUserState();
  if (auth.status !== "authorized" || resolvePrivateAssistantRole(auth.email) !== "karen") {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  let body: { messages?: unknown; collection?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 }); }

  const messages = sanitizeChatMessages(body.messages);
  if (!messages || !isMemoryCollection(body.collection)) {
    return NextResponse.json({ error: "Не удалось определить материал или раздел." }, { status: 400 });
  }

  const memory = buildApprovedMemory(messages, body.collection);
  if (!memory) return NextResponse.json({ error: "В диалоге пока нечего сохранять." }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: "База знаний не подключена." }, { status: 503 });

  const { error } = await supabase.from("assistant_knowledge").insert({
    ...memory,
    audience: audienceForMemory(body.collection),
    collection: body.collection,
    topic: "general",
    created_by: auth.userId
  });
  if (error) return NextResponse.json({ error: /collection/i.test(error.message) ? "Сначала примените новую миграцию базы данных." : `Не удалось сохранить: ${error.message}` }, { status: 500 });

  return NextResponse.json({ saved: true, title: memory.title });
}
