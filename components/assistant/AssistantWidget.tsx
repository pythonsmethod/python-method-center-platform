"use client";

import { useState } from "react";
import { AssistantChat } from "@/components/assistant/AssistantChat";

const SUGGESTIONS = [
  "Как проходит сопровождение?",
  "С чего мне начать?",
  "Какие документы нужно загрузить?"
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="assistant-widget">
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
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "✕" : "☥ Спросить"}
      </button>
    </div>
  );
}
