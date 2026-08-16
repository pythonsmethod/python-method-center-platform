import { NextResponse } from "next/server";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { askAssistantWithAttachments } from "@/lib/assistant/router";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseSupplementExtraction, SUPPLEMENT_EXTRACTION_PROMPT } from "@/lib/supplements/extraction";
import { guardMetricsExtraction } from "@/lib/assistant/guard";

export const runtime = "nodejs";

const hits = new Map<string, { count: number; start: number }>();

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const rate = hits.get(user.id);
  if (rate && now - rate.start < 60_000 && rate.count >= 6) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }
  hits.set(user.id, !rate || now - rate.start >= 60_000 ? { count: 1, start: now } : { ...rate, count: rate.count + 1 });
  if (!(await guardMetricsExtraction(user.id))) {
    return NextResponse.json({ error: "daily-limit" }, { status: 429 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad-request" }, { status: 400 }); }
  const attachments = sanitizeAttachments((body as { attachments?: unknown })?.attachments);
  if (!attachments || attachments === "invalid") return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const result = await askAssistantWithAttachments(SUPPLEMENT_EXTRACTION_PROMPT, [{ role: "user", content: "Read the attached supplement photos or document and prepare the schedule table." }], 2200, attachments);
  if (result.status !== "ok") return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const rows = parseSupplementExtraction(result.reply);
  if (!rows) return NextResponse.json({ error: "unreadable" }, { status: 422 });
  return NextResponse.json({ rows });
}
