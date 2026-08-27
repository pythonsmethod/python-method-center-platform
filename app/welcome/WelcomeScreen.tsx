"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnhamAvatar } from "@/components/assistant/AnhamAvatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { Locale } from "@/lib/i18n/locale";
import {
  AuthForm,
  type AuthFormLabels
} from "@/app/(auth)/login/AuthForm";

type WelcomeScreenProps = {
  locale: Locale;
  authLabels: AuthFormLabels;
  supabaseConfigured: boolean;
  labels: {
    eyebrow: string;
    greeting: string;
    text: string;
    auth: string;
    note: string;
    close: string;
    forgot: string;
  };
};

// The two sheets are opened by a link to their fragment and shown by CSS
// `:target`, which costs no JavaScript and works before hydration. What it
// cannot do is any of the things a dialog owes a keyboard: move focus in,
// keep it there, close on Escape, and put focus back where it came from.
// That part is added here, on top of the CSS, not instead of it.
const AUTH_MODALS = ["login", "signup"] as const;

type AuthModal = (typeof AUTH_MODALS)[number];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function readModalFromHash(): AuthModal | null {
  const id = window.location.hash.replace(/^#/, "");

  return (AUTH_MODALS as readonly string[]).includes(id)
    ? (id as AuthModal)
    : null;
}

export function WelcomeScreen({
  authLabels,
  labels,
  locale,
  supabaseConfigured
}: WelcomeScreenProps) {
  const [openModal, setOpenModal] = useState<AuthModal | null>(null);
  const sheets = useRef<Partial<Record<AuthModal, HTMLElement | null>>>({});
  // Where focus was when the sheet opened, so closing returns it there
  // instead of dropping the keyboard back at the top of the document.
  const opener = useRef<HTMLElement | null>(null);
  // Used when the page was opened straight at /welcome#login and there is
  // no link to go back to.
  const primaryCta = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    document.body.classList.add("welcome-active");
    return () => document.body.classList.remove("welcome-active");
  }, []);

  // The fragment is the single source of truth: it is what the CSS reads,
  // and it is what the browser's Back button changes.
  useEffect(() => {
    const sync = () => {
      const next = readModalFromHash();

      // Read here, not in the effect that opens the sheet. Marking the page
      // behind it inert blurs whatever was focused there, and React applies
      // that attribute before any effect runs — by then the link that
      // opened the sheet has already lost focus and activeElement is
      // <body>, which cannot be focused back.
      if (next && !opener.current) {
        const active = document.activeElement;

        opener.current =
          active instanceof HTMLElement && active !== document.body
            ? active
            : null;
      }

      setOpenModal(next);
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Clearing the fragment is exactly what the ✕ link does, so Escape and
  // the close button leave the page in the same state.
  const closeModal = useCallback(() => {
    window.location.hash = "";
  }, []);

  useEffect(() => {
    if (!openModal) {
      (opener.current ?? primaryCta.current)?.focus();
      opener.current = null;
      return;
    }

    const sheet = sheets.current[openModal];

    if (!sheet) {
      return;
    }

    sheet.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (!sheet) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = Array.from(
        sheet.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.offsetParent !== null);

      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (!(current instanceof HTMLElement) || !sheet.contains(current)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeModal, openModal]);

  // Everything behind an open sheet is unreachable by keyboard, pointer and
  // screen reader alike, so Tab cannot wander out of the dialog into the
  // page it is covering.
  const behind = openModal !== null;

  return (
    <div className="app-welcome">
      <div aria-hidden="true" className="app-welcome__glow" />
      <header className="app-welcome__top" inert={behind}>
        <span className="app-welcome__brand">Python Method Center</span>
        <LanguageSwitcher locale={locale} />
      </header>

      <div className="app-welcome__content" inert={behind}>
        <div className="app-welcome__anham">
          <span aria-hidden="true" className="app-welcome__orbit app-welcome__orbit--one" />
          <span aria-hidden="true" className="app-welcome__orbit app-welcome__orbit--two" />
          <AnhamAvatar
            size={260}
            state="registered"
            title={locale === "ru" ? "Анхам" : "Anham"}
          />
        </div>

        <section className="app-welcome__copy" aria-labelledby="welcome-title">
          <p className="app-welcome__eyebrow">{labels.eyebrow}</p>
          <h1 id="welcome-title">{labels.greeting}</h1>
          <p>{labels.text}</p>
        </section>

        <div className="app-welcome__actions">
          <a
            className="app-welcome__button app-welcome__button--primary"
            href="#login"
            ref={primaryCta}
          >
            {labels.auth}
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <p className="app-welcome__note">{labels.note}</p>
      </div>

      {AUTH_MODALS.map((mode) => (
        <div
          className="app-auth-modal"
          id={mode}
          key={mode}
          role="presentation"
        >
          <section
            aria-label={
              mode === "login" ? authLabels.tabLogin : authLabels.tabSignup
            }
            // Only the sheet that is actually on screen claims to be a modal
            // dialog. Both used to claim it at once, including while closed.
            aria-modal={openModal === mode ? true : undefined}
            className="app-auth-modal__sheet auth-app__card"
            ref={(node) => {
              sheets.current[mode] = node;
            }}
            role="dialog"
            tabIndex={-1}
          >
            <a
              aria-label={labels.close}
              className="app-auth-modal__close"
              href="#"
            >
              ×
            </a>
            <AuthForm
              initialMode={mode}
              labels={authLabels}
              nextPath="/cabinet"
              supabaseConfigured={supabaseConfigured}
            />
            {mode === "login" ? (
              <Link className="app-auth-modal__forgot" href="/recovery">
                {labels.forgot}
              </Link>
            ) : null}
          </section>
        </div>
      ))}
    </div>
  );
}
