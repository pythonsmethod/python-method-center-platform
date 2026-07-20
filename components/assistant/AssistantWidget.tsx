"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantChat } from "@/components/assistant/AssistantChat";

const SUGGESTIONS = [
  "Как проходит сопровождение?",
  "С чего мне начать?",
  "Какие документы нужно загрузить?"
];

const WELCOME_STORAGE_KEY = "pm-assistant-welcome-v1";

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // First-visit greeting: the visitor chooses between exploring the site
  // on their own or being guided by the assistant. Shown once per browser.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(WELCOME_STORAGE_KEY)) {
        return;
      }
    } catch {
      return;
    }

    welcomeTimer.current = setTimeout(() => setShowWelcome(true), 1400);

    return () => {
      if (welcomeTimer.current) {
        clearTimeout(welcomeTimer.current);
      }
    };
  }, []);

  function dismissWelcome(openChat: boolean) {
    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, "seen");
    } catch {
      // Private mode: the greeting will simply show again next visit.
    }

    setShowWelcome(false);

    if (openChat) {
      setOpen(true);
    }
  }

  return (
    <div className="assistant-widget">
      {showWelcome && !open ? (
        <div
          aria-label="Приветствие помощника"
          className="assistant-widget__welcome"
          role="dialog"
        >
          <button
            aria-label="Закрыть приветствие"
            className="assistant-widget__welcome-close"
            onClick={() => dismissWelcome(false)}
            type="button"
          >
            ✕
          </button>
          <p className="assistant-widget__welcome-title">
            ☥ Привет! Добро пожаловать на платформу Python Method —
            «Реабилитация без границ».
          </p>
          <p className="assistant-widget__welcome-text">
            Я ИИ-помощник центра и рад вас приветствовать. Вы можете изучать
            сайт самостоятельно — или перейти в общение со мной, и я проведу
            вас, отвечая на все вопросы.
          </p>
          <div className="assistant-widget__welcome-actions">
            <button
              className="button button--secondary"
              onClick={() => dismissWelcome(false)}
              type="button"
            >
              Изучать сайт самостоятельно
            </button>
            <button
              className="button"
              onClick={() => dismissWelcome(true)}
              type="button"
            >
              Общаться со мной — проведу вас
            </button>
          </div>
          <p className="assistant-widget__welcome-note">
            Я всегда рядом — кнопка «☥ Спросить» внизу экрана.
          </p>
        </div>
      ) : null}

      {open ? (
        <div className="assistant-widget__panel" role="dialog" aria-label="Чат с ИИ-помощником">
          <div className="assistant-widget__header">
            <span>☥ Помощник центра</span>
            <button
              aria-label="Закрыть чат"
              onClick={() => setOpen(false)}
              type="button"
            >
              ✕
            </button>
          </div>
          <AssistantChat
            endpoint="/api/assistant/client"
            intro="Здравствуйте! Я ИИ-помощник Python Method Center. Расскажу, как устроено сопровождение, и помогу сделать первый шаг. Помощник не даёт медицинских рекомендаций и не заменяет врача."
            suggestions={SUGGESTIONS}
          />
        </div>
      ) : null}

      <button
        aria-label={open ? "Закрыть чат с помощником" : "Открыть чат с помощником"}
        className="assistant-widget__toggle"
        onClick={() => {
          if (showWelcome) {
            dismissWelcome(!open);
            return;
          }

          setOpen((value) => !value);
        }}
        type="button"
      >
        {open ? "✕" : "☥ Спросить"}
      </button>
    </div>
  );
}
