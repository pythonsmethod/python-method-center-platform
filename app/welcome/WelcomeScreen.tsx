"use client";

import { useEffect } from "react";
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

export function WelcomeScreen({
  authLabels,
  labels,
  locale,
  supabaseConfigured
}: WelcomeScreenProps) {
  useEffect(() => {
    document.body.classList.add("welcome-active");
    return () => document.body.classList.remove("welcome-active");
  }, []);

  return (
    <div className="app-welcome">
      <div aria-hidden="true" className="app-welcome__glow" />
      <header className="app-welcome__top">
        <span className="app-welcome__brand">Python Method Center</span>
        <LanguageSwitcher locale={locale} />
      </header>

      <div className="app-welcome__content">
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
          >
            {labels.auth}
            <span aria-hidden="true">→</span>
          </a>
        </div>
        <p className="app-welcome__note">{labels.note}</p>
      </div>

      {(["login", "signup"] as const).map((mode) => (
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
            aria-modal="true"
            className="app-auth-modal__sheet auth-app__card"
            role="dialog"
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
