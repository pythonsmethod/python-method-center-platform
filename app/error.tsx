"use client";

import { useEffect } from "react";

// Without this file a crash shows the browser's raw "Application error:
// a client-side exception has occurred" on a black screen — frightening
// and impossible to act on. This turns it into a plain explanation, a
// retry, and a code the team can look up.
export default function ErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Страница не открылась:", error);
  }, [error]);

  const isChunkProblem =
    /chunk|dynamically imported module|Failed to fetch/i.test(error.message);

  return (
    <div className="page-shell">
      <div className="panel">
        <span className="panel__label">Сбой</span>
        <h1>Страница не открылась</h1>

        {isChunkProblem ? (
          <p>
            Похоже, сайт только что обновился, а браузер держал в памяти
            старую версию страницы. Это лечится обновлением — данные в
            безопасности, ничего не потеряно.
          </p>
        ) : (
          <p>
            Что-то пошло не так при открытии этой страницы. Данные в
            безопасности: ничего не изменилось и не потерялось.
          </p>
        )}

        <div className="panel-actions">
          <button className="button" onClick={() => reset()} type="button">
            Попробовать снова
          </button>
          <a className="button button--secondary" href="/">
            На главную
          </a>
        </div>

        <p className="founder-hint">
          Если повторяется — обновите страницу с очисткой (на телефоне
          закройте вкладку и откройте адрес заново). Если и это не помогает,
          пришлите команде код ошибки ниже.
        </p>

        <p className="founder-hint">
          Код ошибки: <code>{error.digest ?? "нет"}</code>
          {error.message ? ` · ${error.message}` : ""}
        </p>
      </div>
    </div>
  );
}
