"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { ANHAM_OPEN_EVENT, type AnhamOpenDetail } from "@/components/assistant/AnhamOpenButton";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

const WELCOME_STORAGE_KEY = "pm-assistant-welcome-v1";

// One lap of the perimeter, matching --anham-wander-duration in the CSS.
const WANDER_MS = 120_000;

// useLayoutEffect runs before the browser paints, which is what keeps the
// correction below invisible. On the server there is no layout, and React
// warns if it is called there — so it is only used where it exists.
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

type AssistantWidgetProps = {
  locale?: Locale;
  // "guest" — public consultant of the center; "registered" — personal
  // assistant inside the cabinet; "client" — personal AI of a paying client.
  tier?: "guest" | "registered" | "client";
};

// Анхам is not a chat button. He travels with the person down the page and
// opens a side panel when asked. He is never modal and never covers the
// content he is meant to help with.
export function AssistantWidget({
  locale = "ru",
  tier = "guest"
}: AssistantWidgetProps) {
  const t = getDictionary(locale).widget;
  const pathname = usePathname();
  const tierCopy = tier === "guest" ? null : t.tiers[tier];
  const header = tierCopy?.header ?? t.header;
  const intro = tierCopy?.intro ?? t.intro;
  const suggestions = tierCopy?.suggestions ?? t.suggestions;
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  // A question that arrived with the request to open, sent as soon as the
  // window is there to send it from.
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const welcomeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const companionRef = useRef<HTMLDivElement | null>(null);

  // First-visit greeting: the visitor chooses between exploring the site
  // on their own or being guided by Анхам. Shown once per browser.
  useEffect(() => {
    // The first-visit greeting belongs to the public consultant only.
    if (
      tier !== "guest" ||
      ["/login", "/recovery", "/reset-password", "/support", "/onboarding", "/payment"].some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      )
    ) {
      return;
    }

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
  }, [pathname, tier]);

  // Anything on the page can ask him to open: the hero buttons, a card, the
  // closing call. They were sending people to the support page instead,
  // which is a different thing entirely — a human queue, not him.
  //
  // #anham does the same for a link arriving from another page.
  useEffect(() => {
    function open(event: Event) {
      const ask = (event as CustomEvent<AnhamOpenDetail>).detail?.ask;

      setShowWelcome(false);
      setOpen(true);

      if (ask) {
        setPendingQuestion(ask);
      }
    }

    window.addEventListener(ANHAM_OPEN_EVENT, open);

    if (window.location.hash === "#anham") {
      open(new Event(ANHAM_OPEN_EVENT));
    }

    return () => window.removeEventListener(ANHAM_OPEN_EVENT, open);
  }, []);

  // Escape closes the panel and returns focus to Анхам, so a keyboard user
  // is never stranded inside it.
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

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

  // The widget lives in each route group's layout, so moving between groups
  // unmounts and remounts it — and the flight restarted from the corner
  // every time, which reads as him being reset rather than accompanying
  // you. Anchoring the animation to the clock with a negative delay puts
  // him back where he would have been had nothing happened. Applied before
  // the browser paints, so there is no jump to see.
  useBeforePaint(() => {
    const node = companionRef.current;

    if (!node) {
      return;
    }

    node.style.setProperty(
      "--anham-wander-delay",
      `-${(Date.now() % WANDER_MS) / 1000}s`
    );
  }, []);

  return (
    <div
      className={`anham-companion anham-companion--${tier}${
        open ? " is-open" : ""
      }`}
      ref={companionRef}
    >
      {showWelcome && !open ? (
        <div
          aria-label={header}
          className="anham-companion__welcome"
          role="dialog"
        >
          <button
            aria-label={t.toggleClose}
            className="anham-companion__welcome-close"
            onClick={() => dismissWelcome(false)}
            type="button"
          >
            ✕
          </button>
          <p className="anham-companion__welcome-title">{t.welcomeTitle}</p>
          <p className="anham-companion__welcome-text">{t.welcomeText}</p>
          <div className="anham-companion__welcome-actions">
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
          <p className="anham-companion__welcome-note">{t.welcomeNote}</p>
        </div>
      ) : null}

      {open ? (
        <aside
          aria-label={header}
          className="anham-panel"
          role="dialog"
        >
          <div className="anham-panel__header">
            <AnhamAvatar size={34} state={tier} />
            <span>{header}</span>
            <button
              aria-label={t.toggleClose}
              onClick={() => {
                setOpen(false);
                toggleRef.current?.focus();
              }}
              type="button"
            >
              ✕
            </button>
          </div>
          <AssistantChat
            // The paperclip belongs to the paid level: a client's personal
            // AI reads the analyses they attach. The server enforces the
            // same rule — this only controls what the window shows.
            attachments={tier === "client"}
            endpoint="/api/assistant/client"
            // Saved conversations exist only for people with an account;
            // a visitor's chat is never stored, so there is nothing to load.
            historyEndpoint={
              tier === "guest" ? undefined : "/api/assistant/history"
            }
            initialQuestion={pendingQuestion}
            intro={intro}
            locale={locale}
            onInitialQuestionSent={() => setPendingQuestion(null)}
            suggestions={suggestions}
          />
        </aside>
      ) : null}

      <button
        aria-expanded={open}
        aria-label={open ? t.toggleClose : t.toggleOpen}
        className="anham-companion__figure"
        onClick={() => {
          if (showWelcome) {
            dismissWelcome(!open);
            return;
          }

          setOpen((value) => !value);
        }}
        ref={toggleRef}
        type="button"
      >
        <AnhamAvatar size={64} state={tier} />
      </button>
    </div>
  );
}
