import { NextResponse } from "next/server";
import { Chess } from "chess.js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiError, apiErrorLocale } from "@/lib/i18n/api-errors";

export const runtime = "nodejs";
const levels = ["beginner", "casual", "intermediate", "advanced", "grandmaster"] as const;

async function authenticated() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function GET() {
  const locale = await apiErrorLocale();
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: apiError("accessDenied", locale) }, { status: 401 });
  const [{ data: game }, { data: preference }] = await Promise.all([
    auth.supabase.from("chess_games").select("id,current_fen,pgn,updated_at")
      .eq("user_id", auth.user.id).eq("status", "active").maybeSingle(),
    auth.supabase.from("chess_preferences").select("skill_level")
      .eq("user_id", auth.user.id).maybeSingle()
  ]);
  return NextResponse.json({ game: game ?? null, level: preference?.skill_level ?? "beginner" });
}

export async function PATCH(request: Request) {
  const locale = await apiErrorLocale();
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: apiError("accessDenied", locale) }, { status: 401 });
  const body = await request.json().catch(() => null) as { level?: unknown } | null;
  if (!body || typeof body.level !== "string" || !levels.includes(body.level as typeof levels[number])) {
    return NextResponse.json({ error: apiError("chessLevelInvalid", locale) }, { status: 400 });
  }
  const { error } = await auth.supabase.from("chess_preferences").upsert(
    { user_id: auth.user.id, skill_level: body.level, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  if (error) return NextResponse.json({ error: apiError("chessLevelNotSaved", locale) }, { status: 500 });
  return NextResponse.json({ level: body.level });
}

export async function POST(request: Request) {
  const locale = await apiErrorLocale();
  const auth = await authenticated();
  if (!auth) return NextResponse.json({ error: apiError("accessDenied", locale) }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: unknown; fen?: unknown; pgn?: unknown } | null;
  if (!body || typeof body.fen !== "string" || typeof body.pgn !== "string" || body.fen.length > 120 || body.pgn.length > 6000) {
    return NextResponse.json({ error: apiError("chessGameInvalid", locale) }, { status: 400 });
  }

  let game: Chess;
  try {
    game = new Chess();
    if (body.pgn) game.loadPgn(body.pgn); else game.load(body.fen);
    if (game.fen() !== body.fen) throw new Error("Position mismatch");
  } catch { return NextResponse.json({ error: apiError("chessGameInvalid", locale) }, { status: 400 }); }

  const now = new Date().toISOString();
  if (body.action === "new") {
    await auth.supabase.from("chess_games").update({ status: "abandoned", updated_at: now })
      .eq("user_id", auth.user.id).eq("status", "active");
  }
  const { data: active } = await auth.supabase.from("chess_games").select("id")
    .eq("user_id", auth.user.id).eq("status", "active").maybeSingle();
  const completed = game.isGameOver();
  const result = game.isCheckmate() ? (game.turn() === "w" ? "0-1" : "1-0") : game.isDraw() ? "1/2-1/2" : null;
  const values = { current_fen: game.fen(), pgn: game.pgn(), status: completed ? "completed" : "active", result, updated_at: now, completed_at: completed ? now : null };
  if (!active && completed) {
    const { data: remembered } = await auth.supabase.from("chess_games").select("id")
      .eq("user_id", auth.user.id).eq("status", "completed")
      .eq("current_fen", game.fen()).eq("pgn", game.pgn()).maybeSingle();
    if (remembered) return NextResponse.json({ gameId: remembered.id });
  }
  const query = active
    ? auth.supabase.from("chess_games").update(values).eq("id", active.id).select("id").single()
    : auth.supabase.from("chess_games").insert({ ...values, user_id: auth.user.id }).select("id").single();
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: apiError("chessGameNotSaved", locale) }, { status: 500 });
  return NextResponse.json({ gameId: data.id });
}
