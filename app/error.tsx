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
        <div className="locale-copy locale-copy--ru" lang="ru">
          <span className="panel__label">Сбой</span>
          <h1>Страница не открылась</h1>
          <p>
            {isChunkProblem
              ? "Сайт только что обновился, а браузер сохранил старую версию страницы. Обновите её — данные в безопасности."
              : "Что-то пошло не так при открытии страницы. Данные в безопасности: ничего не изменилось и не потерялось."}
          </p>
          <div className="panel-actions">
            <button className="button" onClick={() => reset()} type="button">Попробовать снова</button>
            {/* A hard navigation clears a failed client tree and stale chunks. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="button button--secondary" href="/">На главную</a>
          </div>
          <p className="founder-hint">Если ошибка повторяется, обновите страницу с очисткой и передайте команде код ниже.</p>
          <p className="founder-hint">Код ошибки: <code>{error.digest ?? "нет"}</code></p>
        </div>

        <div className="locale-copy locale-copy--en" lang="en">
          <span className="panel__label">Error</span>
          <h1>The page did not open</h1>
          <p>
            {isChunkProblem
              ? "The site was just updated, while the browser kept an older version of the page. Refresh it — your data is safe."
              : "Something went wrong while opening this page. Your data is safe: nothing was changed or lost."}
          </p>
          <div className="panel-actions">
            <button className="button" onClick={() => reset()} type="button">Try again</button>
            {/* A hard navigation clears a failed client tree and stale chunks. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="button button--secondary" href="/">Go to home page</a>
          </div>
          <p className="founder-hint">If the error repeats, refresh the page completely and send the code below to the team.</p>
          <p className="founder-hint">Error code: <code>{error.digest ?? "none"}</code></p>
        </div>
      </div>
    </div>
  );
}
