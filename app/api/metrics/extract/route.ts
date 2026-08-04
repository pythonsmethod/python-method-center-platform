import { NextResponse } from "next/server";
import { sanitizeAttachments } from "@/lib/assistant/attachments";
import { askClaude } from "@/lib/assistant/claude";
import {
  EXTRACTION_SYSTEM_PROMPT,
  parseExtraction
} from "@/lib/metrics/extraction";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Reading a lab printout into rows. The file travels with this one request
// and is gone: nothing is written to storage, because a document nobody
// keeps cannot leak, and the person already has the original.
//
// What comes back is a proposal, not a saved record. The rows are shown to
// the person, who confirms or corrects them before anything is written —
// a misread digit in a medical number is not something to discover later
// on a chart.

const WINDOW_MS = 60_000;
const PER_MINUTE = 6;
const hits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (hits.size > 5000) {
    hits.clear();
  }

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;

  return entry.count > PER_MINUTE;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  // The tool belongs to people with an account: the rows land in their own
  // table, under their own session.
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const attachments = sanitizeAttachments(
    (body as { attachments?: unknown } | null)?.attachments
  );

  if (attachments === null || attachments === "invalid") {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const result = await askClaude(
    EXTRACTION_SYSTEM_PROMPT,
    [
      {
        role: "user",
        content:
          "Перенеси показатели из приложенных файлов в таблицу по заданному формату."
      }
    ],
    2000,
    attachments
  );

  if (result.status !== "ok") {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const parsed = parseExtraction(result.reply);

  if (parsed.status !== "ok") {
    return NextResponse.json({ error: "unreadable" }, { status: 422 });
  }

  return NextResponse.json({ rows: parsed.rows });
}
