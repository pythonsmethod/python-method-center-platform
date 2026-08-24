import { NextResponse } from "next/server";
import { Chess } from "chess.js";
import { sanitizeChatMessages } from "@/lib/assistant/claude";
import { askAssistantTeam } from "@/lib/assistant/router";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; started: number }>();

function limited(userId: string) {
  const now = Date.now();
  const current = hits.get(userId);
  if (!current || now - current.started > WINDOW_MS) {
    hits.set(userId, { count: 1, started: now });
    return false;
  }
  current.count += 1;
  if (hits.size > 5000) hits.clear();
  return current.count > 20;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  if (!user) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  if (limited(user.id)) {
    return NextResponse.json({ error: "Слишком много сообщений подряд. Подождите минуту." }, { status: 429 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 }); }

  const payload = body as { messages?: unknown; locale?: unknown; requestContext?: unknown };
  const messages = sanitizeChatMessages(payload.messages);
  if (!messages) return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });

  const context = payload.requestContext as { fen?: unknown; pgn?: unknown } | null;
  if (!context || typeof context.fen !== "string" || context.fen.length > 120) {
    return NextResponse.json({ error: "Позиция партии недоступна." }, { status: 400 });
  }

  let position: Chess;
  try { position = new Chess(context.fen); }
  catch { return NextResponse.json({ error: "Некорректная позиция партии." }, { status: 400 }); }

  let pgn = "";
  if (typeof context.pgn === "string" && context.pgn.length <= 6000) {
    try {
      const history = new Chess();
      history.loadPgn(context.pgn);
      if (history.fen() === position.fen()) pgn = history.pgn();
    } catch { pgn = ""; }
  }

  const english = payload.locale === "en";
  const system = `You are Anham, a warm and precise chess partner. Discuss only the chess game shown below. The person plays White and Anham plays Black. Explain ideas clearly, name legal candidate moves in algebraic notation, and never invent pieces or moves that are absent from the position. Be concise unless the person asks for a deep analysis. Reply in ${english ? "English" : "Russian"} unless the person writes in another language.\n\nCURRENT POSITION (authoritative FEN):\n${position.fen()}\n\nVALIDATED GAME HISTORY:\n${pgn || "No validated move history is available; analyze the FEN only."}`;
  const result = await askAssistantTeam(system, messages, 1200, "best");

  if (result.status === "unavailable") {
    return NextResponse.json({ error: english ? "Anham is temporarily unavailable." : "Anham временно недоступен." }, { status: 503 });
  }
  if (result.status === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json({ reply: result.reply });
}
