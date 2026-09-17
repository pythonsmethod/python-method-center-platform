"use client";

import { Fragment, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  sendClientSupportMessage,
  sendStaffCaseSupportMessage,
  sendStaffSupportMessage
} from "@/lib/support/actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import type { SupportRequestMessage } from "@/lib/support/types";

type Labels = {
  you: string;
  client: string;
  team: string;
  reply: string;
  placeholder: string;
  send: string;
  sending: string;
  empty: string;
};

type Props = {
  requestId?: string | null;
  caseId?: string;
  messages: SupportRequestMessage[];
  viewer: "client" | "staff";
  locale: "ru" | "en";
  labels: Labels;
};

function calendarDayKey(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string, locale: "ru" | "en", now = new Date()): string {
  const messageDate = new Date(value);
  if (calendarDayKey(messageDate) === calendarDayKey(now)) {
    return locale === "ru" ? "Сегодня" : "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (calendarDayKey(messageDate) === calendarDayKey(yesterday)) {
    return locale === "ru" ? "Вчера" : "Yesterday";
  }

  return messageDate.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function fullDateTime(value: string, locale: "ru" | "en"): string {
  return new Date(value).toLocaleString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function SupportRequestThread({
  requestId,
  caseId,
  messages,
  viewer,
  locale,
  labels
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const action = viewer === "client"
    ? sendClientSupportMessage
    : caseId
      ? sendStaffCaseSupportMessage
      : sendStaffSupportMessage;
  const [state, formAction, pending] = useActionState(
    action,
    initialStaffActionState
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="support-thread">
      <div className="support-thread__messages">
        {messages.length === 0 ? (
          <p className="case-thread__empty">{labels.empty}</p>
        ) : null}
        {messages.map((message, index) => {
          const own = viewer === "client"
            ? message.sender_role === "client"
            : message.sender_role !== "client";
          const currentDay = dayLabel(message.created_at, locale);
          const previousDay = index > 0
            ? dayLabel(messages[index - 1].created_at, locale)
            : null;

          return (
            <Fragment key={message.id}>
              {currentDay !== previousDay ? (
                <div className="case-day"><span>{currentDay}</span></div>
              ) : null}
              <div className={`case-msg${own ? " case-msg--own" : ""}`}>
                <span className="case-msg__sender">
                  {message.sender_role === "client"
                    ? (viewer === "client" ? labels.you : labels.client)
                    : labels.team}
                </span>
                <p>{message.body}</p>
                <time
                  aria-label={fullDateTime(message.created_at, locale)}
                  className="case-msg__time"
                  dateTime={message.created_at}
                  suppressHydrationWarning
                  title={fullDateTime(message.created_at, locale)}
                >
                  {new Date(message.created_at).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
              </div>
            </Fragment>
          );
        })}
      </div>

      <form action={formAction} className="case-thread__form" ref={formRef}>
        {requestId ? <input name="requestId" type="hidden" value={requestId} /> : null}
        {caseId ? <input name="caseId" type="hidden" value={caseId} /> : null}
        <input name="locale" type="hidden" value={locale} />
        <label className="field">
          <span>{labels.reply}</span>
          <textarea
            maxLength={8000}
            name="body"
            placeholder={labels.placeholder}
            required
            rows={3}
          />
        </label>
        <button className="button" disabled={pending} type="submit">
          {pending ? labels.sending : labels.send}
        </button>
        {state.message ? (
          <p aria-live="polite" role="status" className={`form-message form-message--${state.status === "success" ? "success" : "error"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
