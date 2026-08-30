"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

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
import { mergeRefreshedMessages } from "@/lib/messages/merge";
import { VoiceRecorder } from "@/components/messages/VoiceRecorder";

const POLL_INTERVAL_MS = 3000;
const SIGNED_AUDIO_URL_REFRESH_MS = 45 * 60 * 1000;

type CaseMessageThreadProps = {
  messages: CaseMessage[];
  viewer: "client" | "staff";
  caseId?: string;
  loadError?: string | null;
  expandable?: boolean;
  // The thread is shared by the client cabinet and the team workspace, so
  // its wording is handed in rather than read: only the cabinet side is
  // localized, and the workspace stays Russian for the team.
  labels: Dictionary["cabinet"]["thread"];
  voiceLabels: Dictionary["cabinet"]["voice"];
  // Handed in rather than guessed. This used to be inferred by comparing a
  // label to the English word for "today", which quietly breaks the moment
  // that label is reworded.
  dateLocale: string;
  externalDraft?: { id: number; text: string } | null;
};

function senderLabel(role: string, viewer: "client" | "staff",
  t: Dictionary["cabinet"]["thread"]
): string {
  if (role === "client") {
    return viewer === "client" ? t.you : t.client;
  }

  if (role === "karen") {
    return "Professor Python";
  }

  if (viewer === "staff") {
    return t.teamYou;
  }

  return t.team;
}

function formatTime(value: string, locale: string): string {
  return new Date(value).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dayKey(value: string): string {
  return new Date(value).toDateString();
}

function formatDay(
  value: string,
  t: Dictionary["cabinet"]["thread"],
  locale: string
): string {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return t.today;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return t.yesterday;
  }

  return date.toLocaleDateString(locale, {
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
  expandable = false,
  labels: t,
  voiceLabels,
  dateLocale,
  externalDraft = null
}: CaseMessageThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const action = viewer === "client" ? sendClientCaseMessage : sendStaffCaseMessage;
  const [state, formAction, pending] = useActionState(
    action,
    initialStaffActionState
  );
  const [messages, setMessages] = useState<CaseMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastCountRef = useRef(initialMessages.length);
  const signedAudioUrlsAtRef = useRef(Date.now());

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
        const rotateAudioUrls =
          Date.now() - signedAudioUrlsAtRef.current >=
          SIGNED_AUDIO_URL_REFRESH_MS;

        if (rotateAudioUrls) {
          signedAudioUrlsAtRef.current = Date.now();
        }

        setMessages((current) =>
          mergeRefreshedMessages(current, data.messages ?? [], rotateAudioUrls)
        );
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
      setBody("");
      void refresh();
    }
  }, [state, refresh]);

  useEffect(() => {
    if (!externalDraft) {
      return;
    }

    setBody(externalDraft.text);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [externalDraft]);

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
        <p aria-live="assertive" className="form-message form-message--error" role="alert">
          {t.loadError}: {loadError}. {t.loadErrorTail}</p>
      ) : null}

      {expandable ? (
        <div className="case-thread__toolbar">
          {expanded ? <strong>{t.staffTitle}</strong> : <span />}
          <button
            className="button button--secondary"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? `✕ ${t.collapse}` : `⛶ ${t.expand}`}
          </button>
        </div>
      ) : null}

      <div className="case-thread__messages" ref={listRef}>
        {messages.length === 0 && !loadError ? (
          <p className="case-thread__empty">
            {viewer === "client"
              ? t.emptyClient
              : t.emptyStaff}
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
                  <span>{formatDay(message.created_at, t, dateLocale)}</span>
                </div>
              ) : null}
              <div className={`case-msg${own ? " case-msg--own" : ""}`}>
                {!own ? (
                  <span className="case-msg__sender">
                    {senderLabel(message.sender_role, viewer, t)}
                  </span>
                ) : null}
                {message.body ? <p>{message.body}</p> : null}
                {message.audioUrl ? (
                  <audio controls preload="metadata" src={message.audioUrl} />
                ) : message.audio_path && !message.audioUrl ? (
                  <p className="case-msg__missing">{t.audioMissing}</p>
                ) : null}
                <span className="case-msg__time">
                  {formatTime(message.created_at, dateLocale)}
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
          onChange={(event) => setBody(event.target.value)}
          placeholder={
            viewer === "client"
              ? t.placeholderClient
              : t.placeholderStaff
          }
          rows={3}
          ref={textareaRef}
          value={body}
        />
        <div className="case-thread__actions">
          <VoiceRecorder
              labels={voiceLabels} caseId={caseId} onSent={refresh} />
          <button className="button" disabled={pending} type="submit">
            {pending ? t.sending : t.send}
          </button>
        </div>
        {state.status === "error" ? (
          <p aria-live="assertive" className="form-message form-message--error" role="alert">{state.message}</p>
        ) : null}
      </form>

      <p className="case-thread__note">
        {viewer === "client"
          ? t.noteClient
          : t.noteStaff}
      </p>
    </div>
  );
}
