import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync("components/cabinet/OnlineChessWithKaren.tsx", "utf8");
const route = readFileSync("app/api/chess/online/route.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260830152118_chess_online_appointments_and_games.sql", "utf8");
const clientPage = readFileSync("app/(client)/cabinet/chess/page.tsx", "utf8");
const staffPage = readFileSync("app/(admin)/admin/chess/page.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");

describe("scheduled online chess with Karen", () => {
  it("offers the appointment and shared board in both languages", () => {
    expect(component).toContain("Играть с Кареном");
    expect(component).toContain("Play with Karen");
    expect(component).toContain("Записаться на партию");
    expect(component).toContain("Request a game");
    expect(component).toContain("Общая онлайн-доска");
    expect(component).toContain("Shared live chess board");
    expect(component).toContain('type="datetime-local"');
    expect(clientPage).toContain('viewer="client"');
    expect(staffPage).toContain('viewer="karen"');
    expect(staffPage).toContain("isKarenAssistantEmail(auth.email)");
  });

  it("synchronizes the board through Realtime with a polling fallback", () => {
    expect(component).toContain('.channel(\`online-chess-\${viewer}\`)');
    expect(component).toContain('"postgres_changes"');
    expect(component).toContain('table: "chess_online_games"');
    expect(component).toContain("window.setInterval");
    expect(component).toContain("8_000");
    expect(component).toContain("version: selectedAppointment.game.version");
  });

  it("uses the same large black-and-white board in both cabinets", () => {
    expect(styles).toContain(".online-chess__board-frame .chess-board__square");
    expect(styles).toContain("11.5cqi");
    expect(styles).toContain("background-color: #f1f1ed");
    expect(styles).toContain("background-color: #151515");
    expect(styles).toContain("inline-size: min(100%, 760px)");
    expect(styles).toContain("filter: drop-shadow(0 7px 5px");
    expect(styles).toContain("3px 3px 0 #765015");
    expect(styles).toContain("3px 3px 0 #050504");
  });

  it("validates every move on the server and enforces turn order", () => {
    expect(route).toContain("new Chess()");
    expect(route).toContain("expectedPlayer");
    expect(route).toContain('game.turn() === "w"');
    expect(route).toContain('.eq("version", onlineGame.version)');
    expect(route).toContain('error("stale_position", 409)');
    expect(route).toContain("game.move");
    expect(route).toContain("isKarenAssistantEmail(user.email)");
  });

  it("keeps appointments and games private to their two participants", () => {
    expect(migration).toContain("alter table public.chess_appointments enable row level security");
    expect(migration).toContain("alter table public.chess_online_games enable row level security");
    expect(migration).toContain("(select auth.uid()) = client_id");
    expect(migration).toContain("(select auth.uid()) = provider_id");
    expect(migration).toContain("grant select on table public.chess_appointments, public.chess_online_games to authenticated");
    expect(migration).toContain("alter publication supabase_realtime add table public.chess_online_games");
    expect(migration).not.toContain("grant insert");
    expect(migration).not.toContain("grant update");
  });
});
