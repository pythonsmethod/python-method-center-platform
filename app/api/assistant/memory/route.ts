import { NextResponse } from "next/server";
import { audienceForMemory, buildApprovedMemory, isMemoryCollection, sanitizeMemoryMessages } from "@/lib/assistant/memory";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { resolvePrivateAssistantRole } from "@/lib/auth/require-karen";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const english = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ?? false;
  const copy = english ? {
    denied: "Access denied.", invalid: "Invalid request.", unknown: "The material or destination could not be determined.",
    empty: "There is nothing to save in this conversation yet.", disconnected: "The knowledge base is not connected.",
    migration: "Apply the latest database migration first.", saveFailed: "The knowledge could not be saved."
  } : {
    denied: "Нет доступа.", invalid: "Некорректный запрос.", unknown: "Не удалось определить материал или раздел.",
    empty: "В диалоге пока нечего сохранять.", disconnected: "База знаний не подключена.",
    migration: "Сначала примените новую миграцию базы данных.", saveFailed: "Не удалось сохранить знание."
  };
  const auth = await getStaffUserState();
  if (auth.status !== "authorized" || resolvePrivateAssistantRole(auth.email) !== "karen") {
    return NextResponse.json({ error: copy.denied }, { status: 403 });
  }

  let body: { messages?: unknown; collection?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return NextResponse.json({ error: copy.invalid }, { status: 400 }); }

  const messages = sanitizeMemoryMessages(body.messages);
  if (!messages || !isMemoryCollection(body.collection)) {
    return NextResponse.json({ error: copy.unknown }, { status: 400 });
  }

  const memory = buildApprovedMemory(messages, body.collection);
  if (!memory) return NextResponse.json({ error: copy.empty }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: copy.disconnected }, { status: 503 });

  const { error } = await supabase.from("assistant_knowledge").insert({
    ...memory,
    audience: audienceForMemory(body.collection),
    collection: body.collection,
    topic: "general",
    created_by: auth.userId
  });
  if (error) return NextResponse.json({ error: /collection/i.test(error.message) ? copy.migration : copy.saveFailed }, { status: 500 });

  return NextResponse.json({ saved: true, title: memory.title });
}
