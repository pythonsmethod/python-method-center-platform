"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Viewer = "client" | "karen";
type Game = {
  id: string;
  appointment_id: string;
  client_id: string;
  provider_id: string;
  current_fen: string;
  pgn: string;
  version: number;
  status: "waiting" | "active" | "completed";
  result: "1-0" | "0-1" | "1/2-1/2" | null;
  last_move_by: string | null;
  updated_at: string;
};
type Appointment = {
  id: string;
  client_id: string;
  provider_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  client_message: string;
  status: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  client: { id: string; email: string | null; full_name: string | null } | null;
  game: Game | null;
};
type OnlinePayload = { viewerId: string; viewer: Viewer; appointments: Appointment[] };

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const pieceSymbols: Record<string, string> = {
  wp: "♟︎", wn: "♞︎", wb: "♝︎", wr: "♜︎", wq: "♛︎", wk: "♚︎",
  bp: "♟︎", bn: "♞︎", bb: "♝︎", br: "♜︎", bq: "♛︎", bk: "♚︎"
};

function dateInputMinimum() {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function OnlineChessWithKaren({ locale, viewer }: { locale: "ru" | "en"; viewer: Viewer }) {
  const ru = locale === "ru";
  const [payload, setPayload] = useState<OnlinePayload | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [scheduledAt, setScheduledAt] = useState(dateInputMinimum);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/chess/online", { cache: "no-store" });
    if (!response.ok) throw new Error("load_failed");
    const next = await response.json() as OnlinePayload;
    setPayload(next);
    setSelectedAppointmentId((current) => {
      if (current && next.appointments.some((item) => item.id === current && item.game)) return current;
      return next.appointments.find((item) => item.game && item.status !== "cancelled")?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load().catch(() => { if (!cancelled) setError(ru ? "Не удалось загрузить онлайн-партии." : "Could not load online games."); });
    const timer = window.setInterval(() => void load().catch(() => undefined), 8_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [load, ru]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`online-chess-${viewer}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chess_online_games" }, () => {
        void load().catch(() => undefined);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, viewer]);

  const selectedAppointment = payload?.appointments.find((item) => item.id === selectedAppointmentId) ?? null;
  const game = useMemo(() => {
    const next = new Chess();
    if (!selectedAppointment?.game) return next;
    try {
      if (selectedAppointment.game.pgn) next.loadPgn(selectedAppointment.game.pgn);
      else next.load(selectedAppointment.game.current_fen);
    } catch { /* The server remains authoritative; the next refresh retries. */ }
    return next;
  }, [selectedAppointment]);
  const myColour = viewer === "client" ? "w" : "b";
  const myTurn = Boolean(selectedAppointment?.game && selectedAppointment.game.status !== "completed" && game.turn() === myColour);
  const targets = selectedSquare && myTurn
    ? game.moves({ square: selectedSquare, verbose: true }).map((move) => move.to)
    : [];

  async function action(body: Record<string, unknown>, success: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/chess/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "request_failed");
      setNotice(success);
      await load();
    } catch (requestError) {
      const code = requestError instanceof Error ? requestError.message : "request_failed";
      const turnError = code === "not_your_turn"
        ? (ru ? "Сейчас ход другого игрока." : "It is the other player’s turn.")
        : code === "stale_position"
          ? (ru ? "Доска уже обновилась. Повторите ход." : "The board has changed. Please make the move again.")
          : null;
      setError(turnError ?? (ru ? "Не удалось выполнить действие. Попробуйте ещё раз." : "Could not complete the action. Please try again."));
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  function requestAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const iso = new Date(scheduledAt).toISOString();
    void action(
      { action: "request", scheduledAt: iso, message },
      ru ? "Запись отправлена Карену." : "Your appointment request was sent to Karen."
    ).then(() => setMessage(""));
  }

  function selectBoardSquare(square: Square) {
    if (!selectedAppointment?.game || !myTurn || busy) return;
    const piece = game.get(square);
    if (!selectedSquare) {
      if (piece?.color === myColour) setSelectedSquare(square);
      return;
    }
    if (piece?.color === myColour) { setSelectedSquare(square); return; }
    if (!targets.includes(square)) { setSelectedSquare(null); return; }
    const from = selectedSquare;
    setSelectedSquare(null);
    void action({
      action: "move",
      appointmentId: selectedAppointment.id,
      from,
      to: square,
      promotion: "q",
      version: selectedAppointment.game.version
    }, "");
  }

  const boardRows = game.board();
  const renderedRows = viewer === "karen"
    ? [...boardRows].reverse().map((rank) => [...rank].reverse())
    : boardRows;
  const statusLabels = ru
    ? { requested: "Ожидает подтверждения", confirmed: "Подтверждена", in_progress: "Идёт партия", completed: "Завершена", cancelled: "Отменена" }
    : { requested: "Awaiting confirmation", confirmed: "Confirmed", in_progress: "Game in progress", completed: "Completed", cancelled: "Cancelled" };

  return <section className="online-chess" aria-labelledby="online-chess-title">
    <header className="online-chess__header">
      <div>
        <span>{ru ? "Личная онлайн-партия" : "Personal online game"}</span>
        <h2 id="online-chess-title">{ru ? "Играть с Кареном" : "Play with Karen"}</h2>
        <p>{viewer === "client"
          ? (ru ? "Выберите удобное время. После подтверждения вы и Карен будете играть на одной доске." : "Choose a convenient time. Once confirmed, you and Karen will play on the same board.")
          : (ru ? "Подтвердите запись клиента и откройте общую доску." : "Confirm a client’s appointment and open the shared board.")}</p>
      </div>
      <strong><i aria-hidden="true" /> {ru ? "Онлайн-доска" : "Live board"}</strong>
    </header>

    {viewer === "client" ? <form className="online-chess__booking" onSubmit={requestAppointment}>
      <label>
        <span>{ru ? "Дата и время" : "Date and time"}</span>
        <input min={dateInputMinimum()} onChange={(event) => setScheduledAt(event.target.value)} required type="datetime-local" value={scheduledAt} />
      </label>
      <label>
        <span>{ru ? "Сообщение Карену" : "Message to Karen"}</span>
        <textarea maxLength={1000} onChange={(event) => setMessage(event.target.value)} placeholder={ru ? "Например: хочу разобрать дебют и сыграть тренировочную партию" : "For example: I would like to review an opening and play a training game"} rows={3} value={message} />
      </label>
      <button className="button" disabled={busy} type="submit">{busy ? (ru ? "Отправляем…" : "Sending…") : (ru ? "Записаться на партию" : "Request a game")}</button>
    </form> : null}

    {notice ? <p aria-live="polite" className="form-message form-message--success">{notice}</p> : null}
    {error ? <p aria-live="assertive" className="form-message form-message--error">{error}</p> : null}

    <div className="online-chess__appointments">
      <h3>{viewer === "client" ? (ru ? "Мои записи" : "My appointments") : (ru ? "Записи клиентов" : "Client appointments")}</h3>
      {payload && payload.appointments.length === 0 ? <p>{viewer === "client"
        ? (ru ? "Пока нет записей на онлайн-партию." : "You do not have an online game appointment yet.")
        : (ru ? "Новых записей пока нет." : "There are no new appointments yet.")}</p> : null}
      {payload?.appointments.map((appointment) => <article className={selectedAppointmentId === appointment.id ? "is-selected" : undefined} key={appointment.id}>
        <div>
          <strong>{viewer === "karen" ? (appointment.client?.full_name || appointment.client?.email || (ru ? "Клиент" : "Client")) : (ru ? "Партия с Кареном" : "Game with Karen")}</strong>
          <time dateTime={appointment.scheduled_at}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.scheduled_at))}</time>
          <small>{statusLabels[appointment.status]}</small>
          {appointment.client_message ? <p>{appointment.client_message}</p> : null}
        </div>
        <div>
          {viewer === "karen" && appointment.status === "requested" ? <button disabled={busy} onClick={() => void action({ action: "confirm", appointmentId: appointment.id }, ru ? "Запись подтверждена." : "Appointment confirmed.")} type="button">{ru ? "Подтвердить" : "Confirm"}</button> : null}
          {appointment.game ? <button onClick={() => { setSelectedAppointmentId(appointment.id); setSelectedSquare(null); }} type="button">{ru ? "Открыть доску" : "Open board"}</button> : null}
          {appointment.status === "requested" || appointment.status === "confirmed" ? <button className="is-quiet" disabled={busy} onClick={() => void action({ action: "cancel", appointmentId: appointment.id }, ru ? "Запись отменена." : "Appointment cancelled.")} type="button">{ru ? "Отменить" : "Cancel"}</button> : null}
        </div>
      </article>)}
    </div>

    {selectedAppointment?.game ? <div className="online-chess__game">
      <div className="online-chess__turn" aria-live="polite">
        <strong>{selectedAppointment.game.status === "completed"
          ? (ru ? `Партия завершена: ${selectedAppointment.game.result ?? "—"}` : `Game completed: ${selectedAppointment.game.result ?? "—"}`)
          : myTurn ? (ru ? "Ваш ход" : "Your turn") : (ru ? "Ход соперника" : "Opponent’s turn")}</strong>
        <span>{viewer === "client" ? (ru ? "Вы играете белыми" : "You play White") : (ru ? "Вы играете чёрными" : "You play Black")}</span>
      </div>
      <div className="chess-board-frame online-chess__board-frame">
        <div className="chess-board" role="grid" aria-label={ru ? "Общая онлайн-доска" : "Shared live chess board"}>
          {renderedRows.flatMap((rank, visualRankIndex) => rank.map((piece, visualFileIndex) => {
            const rankNumber = viewer === "karen" ? visualRankIndex + 1 : 8 - visualRankIndex;
            const fileIndex = viewer === "karen" ? 7 - visualFileIndex : visualFileIndex;
            const square = `${files[fileIndex]}${rankNumber}` as Square;
            const light = (rankNumber + fileIndex) % 2 === 1;
            const target = targets.includes(square);
            return <button
              aria-label={`${square}${piece ? ` ${pieceSymbols[`${piece.color}${piece.type}`]}` : ""}`}
              className={`chess-board__square ${light ? "is-light" : "is-dark"}${selectedSquare === square ? " is-selected" : ""}${target ? " is-target" : ""}`}
              disabled={!myTurn || busy}
              key={square}
              onClick={() => selectBoardSquare(square)}
              role="gridcell"
              type="button"
            >
              <span className={piece ? `is-${piece.color}` : undefined}>{piece ? pieceSymbols[`${piece.color}${piece.type}`] : ""}</span>
            </button>;
          }))}
        </div>
      </div>
      <p className="online-chess__sync">● {ru ? "Доска синхронизируется автоматически" : "The board updates automatically"}</p>
    </div> : null}
  </section>;
}

