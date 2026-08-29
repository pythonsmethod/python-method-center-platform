import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const chess = readFileSync("components/cabinet/AnhamChess.tsx", "utf8");
const cabinetNav = readFileSync("components/cabinet/CabinetShell.tsx", "utf8");
const mobileNav = readFileSync("components/cabinet/MobileAppShell.tsx", "utf8");
const adminNav = readFileSync("app/(admin)/admin/layout.tsx", "utf8");
const karenChess = readFileSync("app/(admin)/admin/chess/page.tsx", "utf8");
const clientChess = readFileSync("app/(client)/cabinet/chess/page.tsx", "utf8");
const styles = readFileSync("app/globals.css", "utf8");
const chessAssistant = readFileSync("app/api/assistant/chess/route.ts", "utf8");
const chessState = readFileSync("app/api/chess/state/route.ts", "utf8");
const chessMemoryMigration = readFileSync("supabase/migrations/20260825080000_chess_coach_memory.sql", "utf8");
const chessLevelMigration = readFileSync("supabase/migrations/20260825124500_chess_skill_level.sql", "utf8");
const packageJson = readFileSync("package.json", "utf8");
const stockfishPrepare = readFileSync("scripts/prepare-stockfish.mjs", "utf8");

describe("Anham chess", () => {
  it("is reachable from both the website cabinet and the mobile app", () => {
    expect(cabinetNav).toContain("`${root}/chess`");
    expect(mobileNav).toContain("`${root}/chess`");
  });

  it("is available to every authorized staff user with separate game state", () => {
    expect(adminNav).toContain('href: "/admin/chess"');
    expect(adminNav).toContain('auth.status === "authorized"');
    expect(karenChess).not.toContain("resolvePrivateAssistantRole");
    expect(karenChess).toContain("storageScope={`staff-${auth.userId}`}");
  });

  it("keeps each client's saved game separate on shared devices", () => {
    expect(clientChess).toContain('getRequiredUser("/cabinet/chess")');
    expect(clientChess).toContain("`client-${auth.userId}`");
  });

  it("provides complete Russian and English game states", () => {
    expect(chess).toContain("Шахматы с Anham");
    expect(chess).toContain("Chess with Anham");
    expect(chess).toContain("Anham обдумывает ход");
    expect(chess).toContain("Anham is thinking");
    expect(chess).toContain("Новая партия");
    expect(chess).toContain("New game");
  });

  it("uses the chess rules engine and saves the active position", () => {
    expect(chess).toContain('from "chess.js"');
    expect(chess).toContain("window.localStorage.setItem(storageKey, fen)");
  });

  it("forces a consistent text chess set on iOS", () => {
    expect(chess).toContain('wp: "♟︎"');
    expect(chess).toContain('bp: "♟︎"');
    expect(chess).toContain("black pawn into a glossy emoji");
  });

  it("uses the Egyptian board frame and ornamentation", () => {
    expect(chess).toContain("chess-board-frame__ornament");
    expect(chess).toContain("𓋹 · 𓂀 · 𓆣 · 𓇳");
  });

  it("locks the board to eight equal rows and columns on iPhone", () => {
    expect(styles).toContain("grid-template-columns:repeat(8,minmax(0,1fr))");
    expect(styles).toContain("grid-template-rows:repeat(8,minmax(0,1fr))");
    expect(styles).toContain("min-height:0; min-width:0");
  });

  it("normalizes the square geometry across browsers and devices", () => {
    expect(styles).toContain("contain:layout paint; container-type:inline-size");
    expect(styles).toContain("-webkit-appearance:none");
    expect(styles).toContain("grid-template-columns:minmax(0,1fr)");
    expect(styles).not.toContain("aspect-ratio:1; border:0; color:#16100a");
  });

  it("lets every signed-in player discuss the live position with Anham", () => {
    expect(chess).toContain('endpoint="/api/assistant/chess"');
    expect(chess).toContain("requestContext={{ fen, pgn: game.pgn(), level }}");
    expect(chessAssistant).toContain("await supabase.auth.getUser()");
    expect(chessAssistant).toContain("CURRENT POSITION (authoritative FEN)");
    expect(chessAssistant).toContain("history.fen() === position.fen()");
  });

  it("uses larger pieces in both modern and legacy mobile browsers", () => {
    expect(styles).toContain("font-size:clamp(2rem,8vw,4.5rem)");
    expect(styles).toContain("font-size:clamp(2rem,10cqi,4.5rem)");
    expect(styles).toContain("transform:none");
    expect(styles).not.toContain("transform:scale(1.25)");
  });

  it("persists games and coaching conversations per account", () => {
    expect(chess).toContain('fetch("/api/chess/state")');
    expect(chess).toContain('historyEndpoint={preview ? undefined : "/api/assistant/chess"}');
    expect(chessState).toContain('from("chess_games")');
    expect(chessAssistant).toContain('from("chess_conversations")');
    expect(chessAssistant).toContain("PAST GAMES FOR COACHING MEMORY");
    expect(chessMemoryMigration).toContain("enable row level security");
    expect(chessMemoryMigration).toContain("(select auth.uid()) = user_id");
  });

  it("lets each player choose and remember a coaching level", () => {
    expect(chess).toContain('"beginner", "casual", "intermediate", "advanced", "grandmaster"');
    expect(chess).toContain("Новичок");
    expect(chess).toContain("Гроссмейстер");
    expect(chess).toContain("Beginner");
    expect(chess).toContain("Grandmaster");
    expect(chess).toContain('method: "PATCH"');
    expect(chess).toContain("chooseAnhamMove(gameRef.current, level)");
    expect(chessState).toContain('from("chess_preferences")');
    expect(chessAssistant).toContain("explicitly selected chess level");
    expect(chessLevelMigration).toContain("enable row level security");
    expect(chessLevelMigration).toContain("(select auth.uid()) = user_id");
  });

  it("uses a real maximum-strength engine for grandmaster games", () => {
    expect(packageJson).toContain('"stockfish.js": "10.0.2"');
    expect(packageJson).toContain('"postinstall": "node scripts/prepare-stockfish.mjs"');
    expect(stockfishPrepare).toContain('"public", "stockfish"');
    expect(chess).toContain('new Worker("/stockfish/stockfish.js")');
    expect(chess).toContain('setoption name Skill Level value 20');
    expect(chess).toContain('go movetime 6000');
    expect(chess).toContain('level === "grandmaster"');
    expect(chess).toContain('?? chooseAnhamMove(gameRef.current, "grandmaster")');
    expect(chess).toContain("searchIdRef.current");
    expect(chess).toContain("Grandmaster level is powered by");
  });
});
