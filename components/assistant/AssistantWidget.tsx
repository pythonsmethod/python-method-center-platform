"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

const WELCOME_STORAGE_KEY = "pm-assistant-welcome-v1";

type AssistantWidgetProps = {
  locale?: Locale;
};

export function AssistantWidget({ locale = "ru" }: AssistantWidgetProps) {
  const t = getDictionary(locale).widget;
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
          aria-label={t.header}
          className="assistant-widget__welcome"
          role="dialog"
        >
          <button
            aria-label={t.toggleClose}
            className="assistant-widget__welcome-close"
            onClick={() => dismissWelcome(false)}
            type="button"
          >
            ✕
          </button>
          <p className="assistant-widget__welcome-title">{t.welcomeTitle}</p>
          <p className="assistant-widget__welcome-text">{t.welcomeText}</p>
          <div className="assistant-widget__welcome-actions">
            <button
              className="button button--secondary"
              onClick={() => dismissWelcome(false)}
              type="button"
            >
              {t.welcomeExplore}
            </button>
            <button
              className="button"
              onClick={() => dismissWelcome(true)}
              type="button"
            >
              {t.welcomeChat}
            </button>
          </div>
          <p className="assistant-widget__welcome-note">{t.welcomeNote}</p>
        </div>
      ) : null}

      {open ? (
        <div className="assistant-widget__panel" role="dialog" aria-label={t.header}>
          <div className="assistant-widget__header">
            <span>{t.header}</span>
            <button
              aria-label={t.toggleClose}
              onClick={() => setOpen(false)}
              type="button"
            >
              ✕
            </button>
          </div>
          <AssistantChat
            endpoint="/api/assistant/client"
            intro={t.intro}
            locale={locale}
            suggestions={t.suggestions}
          />
        </div>
      ) : null}

      <button
        aria-label={open ? t.toggleClose : t.toggleOpen}
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
        {open ? "✕" : t.toggleOpen}
      </button>
    </div>
  );
}
