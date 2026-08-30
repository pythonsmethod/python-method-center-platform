import { NextResponse } from "next/server";
import { Chess, type Square } from "chess.js";
import { isKarenAssistantEmail } from "@/lib/auth/require-karen";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type ActionBody = {
  action?: unknown;
  appointmentId?: unknown;
  scheduledAt?: unknown;
  message?: unknown;
  from?: unknown;
  to?: unknown;
  promotion?: unknown;
  version?: unknown;
};

async function authenticated() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, isKaren: isKarenAssistantEmail(user.email) };
}

function error(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

export async function GET() {
  const auth = await authenticated();
  const service = createSupabaseServiceClient();
  if (!auth) return error("unauthorized", 401);
  if (!service) return error("service_unavailable", 503);

  let appointmentsQuery = service
    .from("chess_appointments")
    .select("id,client_id,provider_id,scheduled_at,duration_minutes,client_message,status,created_at,updated_at")
    .order("scheduled_at", { ascending: true })
    .limit(50);

  appointmentsQuery = auth.isKaren
    ? appointmentsQuery.in("status", ["requested", "confirmed", "in_progress"])
    : appointmentsQuery.eq("client_id", auth.user.id);

  const { data: appointments, error: appointmentsError } = await appointmentsQuery;
  if (appointmentsError) return error("load_failed", 500);

  const ids = (appointments ?? []).map((item) => item.id);
  const [{ data: games, error: gamesError }, { data: profiles, error: profilesError }] = await Promise.all([
    ids.length
      ? service.from("chess_online_games")
        .select("id,appointment_id,client_id,provider_id,current_fen,pgn,version,status,result,last_move_by,updated_at")
        .in("appointment_id", ids)
      : Promise.resolve({ data: [], error: null }),
    auth.isKaren && (appointments ?? []).length
      ? service.from("profiles")
        .select("id,email,full_name")
        .in("id", [...new Set((appointments ?? []).map((item) => item.client_id))])
      : Promise.resolve({ data: [], error: null })
  ]);
  if (gamesError || profilesError) return error("load_failed", 500);

  return NextResponse.json({
    viewerId: auth.user.id,
    viewer: auth.isKaren ? "karen" : "client",
    appointments: (appointments ?? []).map((appointment) => ({
      ...appointment,
      client: (profiles ?? []).find((profile) => profile.id === appointment.client_id) ?? null,
      game: (games ?? []).find((game) => game.appointment_id === appointment.id) ?? null
    }))
  });
}

export async function POST(request: Request) {
  const auth = await authenticated();
  const service = createSupabaseServiceClient();
  if (!auth) return error("unauthorized", 401);
  if (!service) return error("service_unavailable", 503);
  const body = await request.json().catch(() => null) as ActionBody | null;
  if (!body || typeof body.action !== "string") return error("invalid_request", 400);

  if (body.action === "request") {
    if (auth.isKaren || typeof body.scheduledAt !== "string" || typeof body.message !== "string") {
      return error("invalid_request", 400);
    }
    const scheduledAt = new Date(body.scheduledAt);
    const latestAllowed = Date.now() + 366 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 15 * 60 * 1000 || scheduledAt.getTime() > latestAllowed || body.message.length > 1000) {
      return error("invalid_appointment", 400);
    }
    const { count } = await service.from("chess_appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", auth.user.id)
      .in("status", ["requested", "confirmed", "in_progress"]);
    if ((count ?? 0) >= 5) return error("too_many_open_appointments", 409);

    const { data, error: insertError } = await service.from("chess_appointments")
      .insert({
        client_id: auth.user.id,
        scheduled_at: scheduledAt.toISOString(),
        client_message: body.message.trim()
      })
      .select("id")
      .single();
    if (insertError) return error("save_failed", 500);
    return NextResponse.json({ appointmentId: data.id }, { status: 201 });
  }

  if (typeof body.appointmentId !== "string") return error("invalid_request", 400);
  const { data: appointment, error: appointmentError } = await service.from("chess_appointments")
    .select("id,client_id,provider_id,status")
    .eq("id", body.appointmentId)
    .maybeSingle();
  if (appointmentError || !appointment) return error("not_found", 404);

  const isClient = appointment.client_id === auth.user.id;
  const isProvider = appointment.provider_id === auth.user.id && auth.isKaren;

  if (body.action === "confirm") {
    if (!auth.isKaren || appointment.status !== "requested") return error("forbidden", 403);
    const initial = new Chess();
    const { error: confirmError } = await service.from("chess_appointments")
      .update({ provider_id: auth.user.id, status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", appointment.id)
      .eq("status", "requested");
    if (confirmError) return error("save_failed", 500);
    const { error: gameError } = await service.from("chess_online_games").upsert({
      appointment_id: appointment.id,
      client_id: appointment.client_id,
      provider_id: auth.user.id,
      current_fen: initial.fen(),
      pgn: "",
      version: 0,
      status: "waiting",
      updated_at: new Date().toISOString()
    }, { onConflict: "appointment_id", ignoreDuplicates: true });
    if (gameError) return error("save_failed", 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "cancel") {
    if (!isClient && !isProvider && !auth.isKaren) return error("forbidden", 403);
    if (!["requested", "confirmed"].includes(appointment.status)) return error("invalid_state", 409);
    const { error: cancelError } = await service.from("chess_appointments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", appointment.id);
    if (cancelError) return error("save_failed", 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action !== "move" || (!isClient && !isProvider)) return error("forbidden", 403);
  if (
    typeof body.from !== "string" ||
    typeof body.to !== "string" ||
    typeof body.version !== "number" ||
    !/^[a-h][1-8]$/.test(body.from) ||
    !/^[a-h][1-8]$/.test(body.to)
  ) return error("invalid_move", 400);

  const { data: onlineGame, error: gameLoadError } = await service.from("chess_online_games")
    .select("id,current_fen,pgn,version,status,client_id,provider_id")
    .eq("appointment_id", appointment.id)
    .maybeSingle();
  if (gameLoadError || !onlineGame) return error("not_found", 404);
  if (onlineGame.status === "completed") return error("game_completed", 409);
  if (onlineGame.version !== body.version) return error("stale_position", 409);

  const game = new Chess();
  try {
    if (onlineGame.pgn) game.loadPgn(onlineGame.pgn);
    else game.load(onlineGame.current_fen);
  } catch {
    return error("invalid_position", 500);
  }
  const expectedPlayer = game.turn() === "w" ? onlineGame.client_id : onlineGame.provider_id;
  if (expectedPlayer !== auth.user.id) return error("not_your_turn", 409);

  try {
    game.move({
      from: body.from as Square,
      to: body.to as Square,
      promotion: body.promotion === "r" || body.promotion === "b" || body.promotion === "n" ? body.promotion : "q"
    });
  } catch {
    return error("invalid_move", 400);
  }

  const completed = game.isGameOver();
  const result = game.isCheckmate() ? (game.turn() === "w" ? "0-1" : "1-0") : game.isDraw() ? "1/2-1/2" : null;
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await service.from("chess_online_games")
    .update({
      current_fen: game.fen(),
      pgn: game.pgn(),
      version: onlineGame.version + 1,
      status: completed ? "completed" : "active",
      result,
      last_move_by: auth.user.id,
      started_at: onlineGame.status === "waiting" ? now : undefined,
      updated_at: now,
      completed_at: completed ? now : null
    })
    .eq("id", onlineGame.id)
    .eq("version", onlineGame.version)
    .select("id,current_fen,pgn,version,status,result,last_move_by,updated_at")
    .maybeSingle();
  if (updateError) return error("save_failed", 500);
  if (!updated) return error("stale_position", 409);

  if (completed) {
    await service.from("chess_appointments")
      .update({ status: "completed", updated_at: now })
      .eq("id", appointment.id);
  } else if (appointment.status !== "in_progress") {
    await service.from("chess_appointments")
      .update({ status: "in_progress", updated_at: now })
      .eq("id", appointment.id);
  }

  return NextResponse.json({ game: updated });
}

