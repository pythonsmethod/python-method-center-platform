"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  resendConfirmationEmail,
  signInWithPassword,
  signUpWithPassword
} from "@/lib/auth/actions";
import {
  initialAuthActionState,
  type AuthActionState
} from "@/lib/auth/types";

export type AuthFormLabels = {
  tabLogin: string;
  tabSignup: string;
  email: string;
  phone: string;
  phonePlaceholder: string;
  phoneHint: string;
  password: string;
  passwordConfirm: string;
  showPassword: string;
  submitLogin: string;
  submitSignup: string;
  submitting: string;
  resend: string;
  resending: string;
  formAria: string;
  modeAria: string;
  rememberMe: string;
};

const defaultLabels: AuthFormLabels = {
  tabLogin: "Войти",
  tabSignup: "Создать аккаунт",
  email: "Email",
  phone: "Телефон",
  phonePlaceholder: "+7 999 123-45-67",
  phoneHint:
    "Нужен, чтобы команда могла связаться с вами. Рассылок на него не будет.",
  password: "Пароль",
  passwordConfirm: "Повторите пароль",
  showPassword: "Показать пароль",
  submitLogin: "Войти",
  submitSignup: "Создать аккаунт",
  submitting: "Отправка...",
  resend: "Отправить письмо ещё раз",
  resending: "Отправляем...",
  formAria: "Форма входа и регистрации",
  modeAria: "Режим авторизации",
  rememberMe: "Запомнить меня"
};

type AuthMode = "login" | "signup";

type AuthFormProps = {
  nextPath: string;
  supabaseConfigured: boolean;
  labels?: AuthFormLabels;
  // Which tab opens first. The header has separate "Вход" and
  // "Регистрация" entries, and the second must not land on the login form.
  initialMode?: AuthMode;
  locale?: "ru" | "en";
};

function messageClassName(state: AuthActionState): string {
  return `form-message form-message--${state.status}`;
}

export function AuthForm({
  nextPath,
  supabaseConfigured,
  labels = defaultLabels,
  initialMode = "login",
  locale = "ru"
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  // Every field is held here, not left to the browser. React empties an
  // uncontrolled form once its action returns, so a single mistake used to
  // wipe the phone number and both passwords — and since the address
  // survived, the page looked like it had simply ignored the button.
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  // What went wrong is printed under a button that sits below the fold on
  // a phone. Bringing it into view is the difference between "the site is
  // broken" and "ah, that address is already registered".
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const [loginState, loginAction, loginPending] = useActionState(
    signInWithPassword,
    initialAuthActionState
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUpWithPassword,
    initialAuthActionState
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendConfirmationEmail,
    initialAuthActionState
  );

  const isLogin = mode === "login";
  const activeState = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;
  const passwordType = revealPassword ? "text" : "password";
  // Only offered when Supabase itself said the address is unconfirmed, so
  // the button never appears as a guess.
  const offerResend =
    activeState.code === "email_not_confirmed" && email.length > 0;

  useEffect(() => {
    if (activeState.status === "error") {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [activeState]);

  return (
    <section className="auth-panel" aria-label={labels.formAria}>
      <div className="auth-tabs" role="tablist" aria-label={labels.modeAria}>
        <button
          aria-pressed={isLogin}
          className={isLogin ? "auth-tab auth-tab--active" : "auth-tab"}
          onClick={() => setMode("login")}
          type="button"
        >
          {labels.tabLogin}
        </button>
        <button
          aria-pressed={!isLogin}
          className={!isLogin ? "auth-tab auth-tab--active" : "auth-tab"}
          onClick={() => setMode("signup")}
          type="button"
        >
          {labels.tabSignup}
        </button>
      </div>

      <form
        action={isLogin ? loginAction : signupAction}
        className="auth-form"
      >
        <input name="next" type="hidden" value={nextPath} />
        <input name="locale" type="hidden" value={locale} />
        <label className="field">
          <span>{labels.email}</span>
          <input
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="client@example.com"
            required
            spellCheck={false}
            type="email"
            value={email}
          />
        </label>

        {/* Asked once, at the door. A person who registers and goes quiet
            is otherwise unreachable: until the questionnaire is filled in,
            the team knows nothing but an email address. */}
        {!isLogin ? (
          <label className="field">
            <span>{labels.phone}</span>
            <input
              autoComplete="tel"
              inputMode="tel"
              name="phone"
              onChange={(event) => setPhone(event.target.value)}
              placeholder={labels.phonePlaceholder}
              required
              type="tel"
              value={phone}
            />
            <small className="field__hint">{labels.phoneHint}</small>
          </label>
        ) : null}

        <label className="field">
          <span>{labels.password}</span>
          <input
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 6}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type={passwordType}
            value={password}
          />
        </label>

        {/* Typed twice on sign-up: a slip here is invisible behind the dots,
            and it is the slip that turns into "wrong password" tomorrow. */}
        {!isLogin ? (
          <label className="field">
            <span>{labels.passwordConfirm}</span>
            <input
              autoComplete="new-password"
              minLength={6}
              name="confirm"
              onChange={(event) => setConfirm(event.target.value)}
              required
              type={passwordType}
              value={confirm}
            />
          </label>
        ) : null}

        {isLogin ? (
          <label className="auth-remember">
            <input
              checked={remember}
              name="remember"
              onChange={(event) => setRemember(event.target.checked)}
              type="checkbox"
            />
            <span>{labels.rememberMe}</span>
          </label>
        ) : null}

        <label className="auth-reveal">
          <input
            checked={revealPassword}
            onChange={(event) => setRevealPassword(event.target.checked)}
            type="checkbox"
          />
          <span>{labels.showPassword}</span>
        </label>

        {/* Above the button, not below it. Below, on a phone, it lands
            past the bottom of the screen and the form reads as a button
            that does nothing. */}
        {activeState.message ? (
          <p
            aria-live="polite"
            role={activeState.status === "error" ? "alert" : "status"}
            className={messageClassName(activeState)}
            ref={messageRef}
          >
            {activeState.message}
          </p>
        ) : null}

        <button
          className="button"
          disabled={!supabaseConfigured || pending}
          type="submit"
        >
          {pending
            ? labels.submitting
            : isLogin
              ? labels.submitLogin
              : labels.submitSignup}
        </button>
      </form>

      {offerResend ? (
        <form action={resendAction} className="auth-resend">
          <input name="email" type="hidden" value={email} />
          <button
            className="button button--secondary"
            disabled={!supabaseConfigured || resendPending}
            type="submit"
          >
            {resendPending ? labels.resending : labels.resend}
          </button>
        </form>
      ) : null}

      {resendState.message ? (
        <p className={messageClassName(resendState)}>{resendState.message}</p>
      ) : null}
    </section>
  );
}
