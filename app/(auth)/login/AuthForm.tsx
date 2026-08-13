"use client";

import { useActionState, useState } from "react";
import {
  resendConfirmationEmail,
  signInWithPassword,
  signUpWithPassword
} from "@/lib/auth/actions";
import {
  initialAuthActionState,
  type AuthActionState
} from "@/lib/auth/types";

type AuthFormLabels = {
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
  resending: "Отправляем..."
};

type AuthMode = "login" | "signup";

type AuthFormProps = {
  nextPath: string;
  supabaseConfigured: boolean;
  labels?: AuthFormLabels;
  // Which tab opens first. The header has separate "Вход" and
  // "Регистрация" entries, and the second must not land on the login form.
  initialMode?: AuthMode;
};

function messageClassName(state: AuthActionState): string {
  return `form-message form-message--${state.status}`;
}

export function AuthForm({
  nextPath,
  supabaseConfigured,
  labels = defaultLabels,
  initialMode = "login"
}: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  // The address is held here so the "send the letter again" form below can
  // reuse it without making the person type it a second time.
  const [email, setEmail] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
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

  return (
    <section className="auth-panel" aria-label="Authentication form">
      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
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
              placeholder={labels.phonePlaceholder}
              required
              type="tel"
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
            required
            type={passwordType}
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
              required
              type={passwordType}
            />
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

        {activeState.message ? (
          <p className={messageClassName(activeState)}>{activeState.message}</p>
        ) : null}
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
