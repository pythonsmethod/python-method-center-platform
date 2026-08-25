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

async function authenticated() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function GET() {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  const { data } = await auth.supabase.from("chess_conversations")
    .select("role,content").eq("user_id", auth.user.id)
    .order("created_at", { ascending: false }).limit(40);
  const messages = (data ?? []).reverse().map((row) => ({ role: row.role, content: row.content }));
  return NextResponse.json({ messages });
}

export async function POST(request: Request) {
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: "Нет доступа." }, { status: 401 });
  if (limited(auth.user.id)) {
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
  const [{ data: pastGames }, { data: activeGame }] = await Promise.all([
    auth.supabase.from("chess_games").select("pgn,result,status,updated_at")
      .eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(8),
    auth.supabase.from("chess_games").select("id").eq("user_id", auth.user.id)
      .eq("status", "active").maybeSingle()
  ]);
  const memory = (pastGames ?? []).map((game, index) =>
    `${index + 1}. ${game.status}${game.result ? `, result ${game.result}` : ""}; PGN: ${game.pgn || "no moves"}`
  ).join("\n");
  const system = `You are Anham, a patient personal chess coach and playing partner. The person plays White and Anham plays Black. Teach the person how to think: explain rules when needed, ask guiding questions, identify recurring mistakes from remembered games, praise specific improvement, and adapt explanations to their apparent level. Do not merely give a move without explaining the idea. Name only legal candidate moves in algebraic notation and never invent pieces or moves absent from the authoritative position. Reply in ${english ? "English" : "Russian"} unless the person writes in another language.\n\nCURRENT POSITION (authoritative FEN):\n${position.fen()}\n\nCURRENT GAME HISTORY:\n${pgn || "No validated move history is available; analyze the FEN only."}\n\nPAST GAMES FOR COACHING MEMORY:\n${memory || "This is the first remembered game."}`;
  const result = await askAssistantTeam(system, messages, 1200, "best");

  if (result.status === "unavailable") {
    return NextResponse.json({ error: english ? "Anham is temporarily unavailable." : "Anham временно недоступен." }, { status: 503 });
  }
  if (result.status === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  const question = messages[messages.length - 1]?.content?.trim() ?? "";
  if (question) {
    await auth.supabase.from("chess_conversations").insert([
      { game_id: activeGame?.id ?? null, user_id: auth.user.id, role: "user", content: question.slice(0, 8000), position_fen: position.fen() },
      { game_id: activeGame?.id ?? null, user_id: auth.user.id, role: "assistant", content: result.reply.slice(0, 8000), position_fen: position.fen() }
    ]);
  }
  return NextResponse.json({ reply: result.reply });
}
