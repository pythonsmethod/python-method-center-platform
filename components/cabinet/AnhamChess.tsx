"use client";

import { useEffect, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { AssistantChat } from "@/components/assistant/AssistantChat";

type AnhamChessProps = {
  locale: "ru" | "en";
  preview?: boolean;
  storageScope?: string;
};

type ChessLevel = "beginner" | "casual" | "intermediate" | "advanced" | "grandmaster";
type EngineMove = { from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" };

const chessLevels: ChessLevel[] = ["beginner", "casual", "intermediate", "advanced", "grandmaster"];
const levelDepth: Record<ChessLevel, number> = { beginner: -1, casual: 0, intermediate: 1, advanced: 2, grandmaster: 3 };

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const pieces: Record<string, string> = {
  // One solid symbol set for both colours plus VS15 keeps iOS from turning
  // only the black pawn into a glossy emoji while the other pieces stay text.
  wp: "♟︎", wn: "♞︎", wb: "♝︎", wr: "♜︎", wq: "♛︎", wk: "♚︎",
  bp: "♟︎", bn: "♞︎", bb: "♝︎", br: "♜︎", bq: "♛︎", bk: "♚︎"
};
const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000 };

function score(game: Chess) {
  if (game.isCheckmate()) return game.turn() === "w" ? 100_000 : -100_000;
  if (game.isDraw()) return 0;
  return game.board().flat().reduce((sum, piece) => piece
    ? sum + values[piece.type] * (piece.color === "b" ? 1 : -1)
    : sum, 0);
}

function minimax(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return score(game);
  const maximizing = game.turn() === "b";
  let best = maximizing ? -Infinity : Infinity;
  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    const value = minimax(game, depth - 1, alpha, beta);
    game.undo();
    if (maximizing) { best = Math.max(best, value); alpha = Math.max(alpha, best); }
    else { best = Math.min(best, value); beta = Math.min(beta, best); }
    if (beta <= alpha) break;
  }
  return best;
}

function chooseAnhamMove(game: Chess, level: ChessLevel): Move | null {
  const moves = game.moves({ verbose: true });
  if (level === "beginner") return moves[Math.floor(Math.random() * moves.length)] ?? null;
  let best = -Infinity;
  let choices: Move[] = [];
  for (const move of moves) {
    game.move(move);
    const value = minimax(game, levelDepth[level], -Infinity, Infinity);
    game.undo();
    if (value > best) { best = value; choices = [move]; }
    else if (value === best) choices.push(move);
  }
  return choices[Math.floor(Math.random() * choices.length)] ?? null;
}

function chooseStockfishMove(fen: string): Promise<EngineMove | null> {
  return new Promise((resolve) => {
    const worker = new Worker("/stockfish/stockfish.js");
    let settled = false;
    const finish = (move: EngineMove | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      worker.terminate();
      resolve(move);
    };
    const timeout = window.setTimeout(() => finish(null), 12_000);

    worker.onerror = () => finish(null);
    worker.onmessage = (event: MessageEvent<string>) => {
      const line = String(event.data);
      if (line === "uciok") {
        worker.postMessage("setoption name Skill Level value 20");
        worker.postMessage("setoption name Hash value 16");
        worker.postMessage("isready");
      } else if (line === "readyok") {
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage("go movetime 6000");
      } else if (line.startsWith("bestmove ")) {
        const uci = line.split(" ")[1] ?? "";
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return finish(null);
        finish({
          from: uci.slice(0, 2) as Square,
          to: uci.slice(2, 4) as Square,
          promotion: uci[4] as EngineMove["promotion"]
        });
      }
    };
    worker.postMessage("uci");
  });
}

export function AnhamChess({ locale, preview = false, storageScope = "client" }: AnhamChessProps) {
  const ru = locale === "ru";
  const storageKey = preview
    ? "pm-anham-chess-preview"
    : `pm-anham-chess-${storageScope}`;
  const gameRef = useRef(new Chess());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);
  const [ready, setReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(preview);
  const [level, setLevel] = useState<ChessLevel>("beginner");
  const searchIdRef = useRef(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    const savedLevel = window.localStorage.getItem(`${storageKey}-level`);
    if (savedLevel && chessLevels.includes(savedLevel as ChessLevel)) setLevel(savedLevel as ChessLevel);
    if (saved) {
      try { gameRef.current.load(saved); setFen(gameRef.current.fen()); } catch { window.localStorage.removeItem(storageKey); }
    }
    setReady(true);
  }, [storageKey]);
  useEffect(() => { if (ready) window.localStorage.setItem(storageKey, fen); }, [fen, ready, storageKey]);
  useEffect(() => { if (ready) window.localStorage.setItem(`${storageKey}-level`, level); }, [level, ready, storageKey]);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    void fetch("/api/chess/state")
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { game?: { current_fen?: string; pgn?: string } | null; level?: ChessLevel } | null) => {
        if (cancelled || !payload) return;
        if (payload.level && chessLevels.includes(payload.level)) setLevel(payload.level);
        if (!payload.game) return;
        try {
          const restored = new Chess();
          if (payload.game.pgn) restored.loadPgn(payload.game.pgn);
          else if (payload.game.current_fen) restored.load(payload.game.current_fen);
          gameRef.current = restored;
          setFen(restored.fen());
          setSelected(null);
        } catch { /* Keep the valid device copy. */ }
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setRemoteReady(true); });
    return () => { cancelled = true; };
  }, [preview]);

  useEffect(() => {
    if (!ready || !remoteReady || preview) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/chess/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", fen, pgn: gameRef.current.pgn() })
      });
    }, 550);
    return () => window.clearTimeout(timer);
  }, [fen, preview, ready, remoteReady]);

  function changeLevel(nextLevel: ChessLevel) {
    setLevel(nextLevel);
    if (!preview) {
      void fetch("/api/chess/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: nextLevel })
      });
    }
  }

  const game = gameRef.current;
  const targets = selected
    ? game.moves({ square: selected, verbose: true }).map((move) => move.to)
    : [];

  function status() {
    if (game.isCheckmate()) return game.turn() === "w"
      ? (ru ? "Мат. Anham выиграл партию." : "Checkmate. Anham won the game.")
      : (ru ? "Мат. Вы победили Anham!" : "Checkmate. You defeated Anham!");
    if (game.isDraw()) return ru ? "Ничья. Отличная партия." : "Draw. Well played.";
    if (thinking) return ru ? "Anham обдумывает ход…" : "Anham is thinking…";
    if (game.inCheck()) return ru ? "Шах вашему королю" : "Your king is in check";
    return ru ? "Ваш ход — вы играете белыми" : "Your move — you are White";
  }

  function playAnham() {
    setThinking(true);
    const searchId = ++searchIdRef.current;
    window.setTimeout(async () => {
      const move = level === "grandmaster"
        ? (await chooseStockfishMove(gameRef.current.fen()))
          ?? chooseAnhamMove(gameRef.current, "grandmaster")
        : chooseAnhamMove(gameRef.current, level);
      if (searchId !== searchIdRef.current) return;
      if (move) gameRef.current.move(move);
      setFen(gameRef.current.fen());
      setThinking(false);
    }, 420);
  }

  function selectSquare(square: Square) {
    if (thinking || game.isGameOver() || game.turn() !== "w") return;
    const piece = game.get(square);
    if (!selected) {
      if (piece?.color === "w") setSelected(square);
      return;
    }
    if (piece?.color === "w") { setSelected(square); return; }
    try {
      game.move({ from: selected, to: square, promotion: "q" });
      setSelected(null); setFen(game.fen());
      if (!game.isGameOver()) playAnham();
    } catch { setSelected(null); }
  }

  function newGame() {
    searchIdRef.current += 1;
    game.reset(); setSelected(null); setThinking(false); setFen(game.fen());
    if (!preview) {
      void fetch("/api/chess/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "new", fen: game.fen(), pgn: "" })
      });
    }
  }

  function takeBack() {
    if (thinking) return;
    game.undo();
    if (game.turn() === "b") game.undo();
    setSelected(null); setFen(game.fen());
  }

  const board = game.board();
  return <section className="chess-room" aria-labelledby="anham-chess-title">
    <header className="chess-room__header">
      <div><span>{ru ? "Игра с ИИ-помощником" : "Play with your AI assistant"}</span><h1 id="anham-chess-title">{ru ? "Шахматы с Anham" : "Chess with Anham"}</h1></div>
      <div className="chess-room__opponent"><b>✣</b><span><strong>Anham</strong><small>{ru ? "в сети" : "online"}</small></span><i aria-label={ru ? "В сети" : "Online"} /></div>
    </header>
    <div className="chess-room__level">
      <span id="chess-level-label">{ru ? "Ваш уровень" : "Your level"}</span>
      <div aria-labelledby="chess-level-label" role="radiogroup">
        {chessLevels.map((item) => {
          const labels = ru
            ? { beginner: "Новичок", casual: "Любитель", intermediate: "Средний", advanced: "Продвинутый", grandmaster: "Гроссмейстер" }
            : { beginner: "Beginner", casual: "Casual", intermediate: "Intermediate", advanced: "Advanced", grandmaster: "Grandmaster" };
          return <button aria-checked={level === item} className={level === item ? "is-active" : undefined} key={item} onClick={() => changeLevel(item)} role="radio" type="button">{labels[item]}</button>;
        })}
      </div>
    </div>
    <div className="chess-room__statusbar">
      <div aria-live="polite" className={`chess-room__status${thinking ? " is-thinking" : ""}`}>{status()}</div>
      <button aria-label={ru ? "Начать новую партию" : "Start a new game"} onClick={newGame} type="button">↻ <span>{ru ? "Заново" : "Restart"}</span></button>
    </div>
    <div className="chess-room__layout">
      <div className="chess-board-frame">
        <div aria-hidden="true" className="chess-board-frame__ornament">𓋹 · 𓂀 · 𓆣 · 𓇳 · 𓆣 · 𓂀 · 𓋹</div>
        <div className="chess-board" role="grid" aria-label={ru ? "Шахматная доска" : "Chess board"}>
          {board.flatMap((rank, rankIndex) => rank.map((piece, fileIndex) => {
            const square = `${files[fileIndex]}${8 - rankIndex}` as Square;
            const light = (rankIndex + fileIndex) % 2 === 0;
            const isSelected = selected === square; const target = targets.includes(square);
            return <button aria-label={`${square}${piece ? ` ${pieces[`${piece.color}${piece.type}`]}` : ""}`} className={`chess-board__square ${light ? "is-light" : "is-dark"}${isSelected ? " is-selected" : ""}${target ? " is-target" : ""}`} disabled={thinking} key={square} onClick={() => selectSquare(square)} role="gridcell" type="button">
              <span className={piece ? `is-${piece.color}` : undefined}>{piece ? pieces[`${piece.color}${piece.type}`] : ""}</span>
              {fileIndex === 0 ? <small className="chess-board__rank">{8 - rankIndex}</small> : null}
              {rankIndex === 7 ? <small className="chess-board__file">{files[fileIndex]}</small> : null}
            </button>;
          }))}
        </div>
        <div aria-hidden="true" className="chess-board-frame__seal"><span>𓂀</span></div>
      </div>
      <aside className="chess-room__panel">
        <div className="chess-room__tip"><b>✣</b><p><strong>{ru ? "Подсказка Anham" : "Anham’s tip"}</strong>{ru ? "Нажмите на фигуру, затем на подсвеченное поле. Пешка на последней линии автоматически станет ферзём." : "Tap a piece, then a highlighted square. A pawn reaching the last rank is promoted to a queen."}</p></div>
        <div className="chess-room__actions"><button onClick={takeBack} type="button">↶ {ru ? "Вернуть ход" : "Take back"}</button><button onClick={newGame} type="button">＋ {ru ? "Новая партия" : "New game"}</button></div>
        <p className="chess-room__saved">✓ {ru ? "Партия и уровень сохраняются в вашем аккаунте" : "Game and level are saved to your account"}</p>
        <p className="chess-room__engine">{ru ? "Уровень «Гроссмейстер» работает на движке" : "Grandmaster level is powered by"} <a href="/stockfish/NOTICE.txt" target="_blank">Stockfish</a></p>
      </aside>
    </div>
    <section className="chess-room__discussion" aria-labelledby="chess-discussion-title">
      <div className="chess-room__discussion-head">
        <b aria-hidden="true">𓂀</b>
        <div><span>{ru ? "Разбор партии" : "Game discussion"}</span><h2 id="chess-discussion-title">{ru ? "Обсудить партию с Anham" : "Discuss the game with Anham"}</h2></div>
      </div>
      <AssistantChat
        endpoint="/api/assistant/chess"
        historyEndpoint={preview ? undefined : "/api/assistant/chess"}
        intro={ru ? "Я ваш шахматный наставник. Вижу текущую позицию и помню прошлые партии: объясню правила, помогу найти идею и разберу ошибки без готового ответа вместо вас." : "I am your chess coach. I can see the current position and remember past games: I will explain rules, help you find ideas, and review mistakes without simply playing for you."}
        locale={locale}
        placeholder={ru ? "Спросите Anham о партии…" : "Ask Anham about the game…"}
        requestContext={{ fen, pgn: game.pgn(), level }}
        suggestions={ru
          ? ["Научи меня находить хороший ход", "Какую ошибку я повторяю?", "Объясни план в этой позиции"]
          : ["Teach me how to find a good move", "What mistake do I keep repeating?", "Explain the plan in this position"]}
      />
    </section>
  </section>;
}
