"use client";

import { Fragment, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  sendClientSupportMessage,
  sendStaffSupportMessage
} from "@/lib/support/actions";
import { initialStaffActionState } from "@/lib/cases/staff-types";
import type { SupportRequestMessage } from "@/lib/support/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { VoiceRecorder } from "@/components/messages/VoiceRecorder";

type Labels = {
  you: string;
  client: string;
  team: string;
  reply: string;
  placeholder: string;
  send: string;
  sending: string;
  empty: string;
  audioMissing: string;
};

type Props = {
  requestId: string;
  messages: SupportRequestMessage[];
  viewer: "client" | "staff";
  locale: "ru" | "en";
  labels: Labels;
  voiceLabels: Dictionary["cabinet"]["voice"];
};

function dayLabel(value: string, locale: "ru" | "en"): string {
  return new Date(value).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function SupportRequestThread({
  requestId,
  messages,
  viewer,
  locale,
  labels,
  voiceLabels
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const action = viewer === "client"
    ? sendClientSupportMessage
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
                {message.body ? <p>{message.body}</p> : null}
                {message.audioUrl ? (
                  <audio controls preload="metadata" src={message.audioUrl} />
                ) : message.audio_path ? (
                  <p className="case-msg__missing">{labels.audioMissing}</p>
                ) : null}
                <span className="case-msg__time">
                  {new Date(message.created_at).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>

      <form action={formAction} className="case-thread__form" ref={formRef}>
        <input name="requestId" type="hidden" value={requestId} />
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
      <VoiceRecorder
        labels={voiceLabels}
        locale={locale}
        onSent={() => router.refresh()}
        supportRequestId={requestId}
      />
    </div>
  );
}
