"use client";

import { useActionState } from "react";
import {
  sendClientCaseMessage,
  sendStaffCaseMessage
} from "@/lib/messages/actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import type { CaseMessage } from "@/lib/messages/queries";
import { VoiceRecorder } from "@/components/messages/VoiceRecorder";

type CaseMessageThreadProps = {
  messages: CaseMessage[];
  viewer: "client" | "staff";
  caseId?: string;
  loadError?: string | null;
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

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function CaseMessageThread({
  messages,
  viewer,
  caseId,
  loadError
}: CaseMessageThreadProps) {
  const action = viewer === "client" ? sendClientCaseMessage : sendStaffCaseMessage;
  const [state, formAction, pending] = useActionState(
    action,
    initialStaffActionState
  );

  return (
    <div className="case-thread">
      {loadError ? (
        <p className="form-message form-message--error">
          Сообщения недоступны: {loadError}. Возможно, миграция ещё не применена.
        </p>
      ) : null}

      <div className="case-thread__messages">
        {messages.length === 0 && !loadError ? (
          <p className="case-thread__empty">
            {viewer === "client"
              ? "Сообщений пока нет. Напишите или запишите голосовое — команда ответит здесь."
              : "Сообщений пока нет. Напишите клиенту или запишите голосовое."}
          </p>
        ) : null}

        {messages.map((message) => {
          const own =
            (viewer === "client" && message.sender_role === "client") ||
            (viewer === "staff" && message.sender_role !== "client");

          return (
            <div
              className={`case-msg${own ? " case-msg--own" : ""}`}
              key={message.id}
            >
              <span className="case-msg__meta">
                {senderLabel(message.sender_role, viewer)} ·{" "}
                {formatWhen(message.created_at)}
              </span>
              {message.body ? <p>{message.body}</p> : null}
              {message.audioUrl ? (
                <audio controls preload="metadata" src={message.audioUrl} />
              ) : message.audio_path && !message.audioUrl ? (
                <p className="case-msg__missing">Голосовое недоступно.</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <form action={formAction} className="case-thread__form">
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
          <VoiceRecorder caseId={caseId} />
          <button className="button" disabled={pending} type="submit">
            {pending ? "Отправляю…" : "Отправить"}
          </button>
        </div>
        {state.status !== "idle" ? (
          <p className={`form-message form-message--${state.status}`}>
            {state.message}
          </p>
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
