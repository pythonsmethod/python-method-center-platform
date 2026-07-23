"use client";

import {
  Fragment,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";
import {
  sendClientCaseMessage,
  sendStaffCaseMessage
} from "@/lib/messages/actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import type { CaseMessage } from "@/lib/messages/queries";
import { VoiceRecorder } from "@/components/messages/VoiceRecorder";

const POLL_INTERVAL_MS = 3000;

type CaseMessageThreadProps = {
  messages: CaseMessage[];
  viewer: "client" | "staff";
  caseId?: string;
  loadError?: string | null;
  expandable?: boolean;
};

function senderLabel(role: string, viewer: "client" | "staff"): string {
  if (role === "client") {
    return viewer === "client" ? "Вы" : "Клиент";
  }

  if (role === "karen") {
    return "Карен";
  }

  if (viewer === "staff") {
    return "Команда (вы)";
  }

  return "Команда центра";
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dayKey(value: string): string {
  return new Date(value).toDateString();
}

function formatDay(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Сегодня";
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return "Вчера";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year:
      date.getFullYear() === today.getFullYear() ? undefined : "numeric"
  });
}

export function CaseMessageThread({
  messages: initialMessages,
  viewer,
  caseId,
  loadError,
  expandable = false
}: CaseMessageThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const action = viewer === "client" ? sendClientCaseMessage : sendStaffCaseMessage;
  const [state, formAction, pending] = useActionState(
    action,
    initialStaffActionState
  );
  const [messages, setMessages] = useState<CaseMessage[]>(initialMessages);
  const listRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const lastCountRef = useRef(initialMessages.length);

  const refresh = useCallback(async () => {
    try {
      const query = caseId ? `?caseId=${encodeURIComponent(caseId)}` : "";
      const response = await fetch(`/api/messages/thread${query}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { messages?: CaseMessage[] };

      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch {
      // Network hiccup: keep the current list, next poll will retry.
    }
  }, [caseId]);

  // Messenger-style live updates: poll while the tab is visible, refresh
  // instantly when the user returns to the tab.
  useEffect(() => {
    if (loadError) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh, loadError]);

  // Fullscreen mode: lock page scroll behind the overlay.
  useEffect(() => {
    if (!expanded) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  // After a successful text send: clear the form and pull the new message in.
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      void refresh();
    }
  }, [state, refresh]);

  // Keep the view pinned to the latest message.
  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      const node = listRef.current;

      if (node) {
        node.scrollTop = node.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className={`case-thread${expanded ? " case-thread--full" : ""}`}>
      {loadError ? (
        <p className="form-message form-message--error">
          Сообщения недоступны: {loadError}. Возможно, миграция ещё не применена.
        </p>
      ) : null}

      {expandable ? (
        <div className="case-thread__toolbar">
          {expanded ? <strong>Чат с клиентом</strong> : <span />}
          <button
            className="button button--secondary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "✕ Свернуть" : "⛶ Развернуть чат"}
          </button>
        </div>
      ) : null}

      <div className="case-thread__messages" ref={listRef}>
        {messages.length === 0 && !loadError ? (
          <p className="case-thread__empty">
            {viewer === "client"
              ? "Сообщений пока нет. Напишите или запишите голосовое — команда ответит здесь."
              : "Сообщений пока нет. Напишите клиенту или запишите голосовое."}
          </p>
        ) : null}

        {messages.map((message, index) => {
          const own =
            (viewer === "client" && message.sender_role === "client") ||
            (viewer === "staff" && message.sender_role !== "client");
          const day = dayKey(message.created_at);
          const prevDay =
            index > 0 ? dayKey(messages[index - 1].created_at) : null;

          return (
            <Fragment key={message.id}>
              {day !== prevDay ? (
                <div className="case-day">
                  <span>{formatDay(message.created_at)}</span>
                </div>
              ) : null}
              <div className={`case-msg${own ? " case-msg--own" : ""}`}>
                {!own ? (
                  <span className="case-msg__sender">
                    {senderLabel(message.sender_role, viewer)}
                  </span>
                ) : null}
                {message.body ? <p>{message.body}</p> : null}
                {message.audioUrl ? (
                  <audio controls preload="metadata" src={message.audioUrl} />
                ) : message.audio_path && !message.audioUrl ? (
                  <p className="case-msg__missing">Голосовое недоступно.</p>
                ) : null}
                <span className="case-msg__time">
                  {formatTime(message.created_at)}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>

      <form action={formAction} className="case-thread__form" ref={formRef}>
        {caseId ? <input name="caseId" type="hidden" value={caseId} /> : null}
        <textarea
          maxLength={8000}
          name="body"
          placeholder={
            viewer === "client"
              ? "Напишите сообщение команде…"
              : "Напишите сообщение клиенту…"
          }
          rows={3}
        />
        <div className="case-thread__actions">
          <VoiceRecorder caseId={caseId} onSent={refresh} />
          <button className="button" disabled={pending} type="submit">
            {pending ? "Отправляю…" : "Отправить"}
          </button>
        </div>
        {state.status === "error" ? (
          <p className="form-message form-message--error">{state.message}</p>
        ) : null}
      </form>

      <p className="case-thread__note">
        {viewer === "client"
          ? "Ответы по вашему состоянию и документам даёт лично Карен после изучения кейса."
          : "Помните: ответы по состоянию, анализам и маршруту клиент получает только после решения Карена."}
      </p>
    </div>
  );
}
