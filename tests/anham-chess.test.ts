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
    expect(chess).toContain("requestContext={{ fen, pgn: game.pgn() }}");
    expect(chessAssistant).toContain("await supabase.auth.getUser()");
    expect(chessAssistant).toContain("CURRENT POSITION (authoritative FEN)");
    expect(chessAssistant).toContain("history.fen() === position.fen()");
  });
});
