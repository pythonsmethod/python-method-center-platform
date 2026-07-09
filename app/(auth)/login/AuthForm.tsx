"use client";

import { useActionState, useState } from "react";
import { signInWithPassword, signUpWithPassword } from "@/lib/auth/actions";
import {
  initialAuthActionState,
  type AuthActionState
} from "@/lib/auth/types";

type AuthFormProps = {
  nextPath: string;
  supabaseConfigured: boolean;
};

type AuthMode = "login" | "signup";

function messageClassName(state: AuthActionState): string {
  return `form-message form-message--${state.status}`;
}

export function AuthForm({ nextPath, supabaseConfigured }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginState, loginAction, loginPending] = useActionState(
    signInWithPassword,
    initialAuthActionState
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUpWithPassword,
    initialAuthActionState
  );

  const isLogin = mode === "login";
  const activeState = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <section className="auth-panel" aria-label="Authentication form">
      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          aria-pressed={isLogin}
          className={isLogin ? "auth-tab auth-tab--active" : "auth-tab"}
          onClick={() => setMode("login")}
          type="button"
        >
          Войти
        </button>
        <button
          aria-pressed={!isLogin}
          className={!isLogin ? "auth-tab auth-tab--active" : "auth-tab"}
          onClick={() => setMode("signup")}
          type="button"
        >
          Создать аккаунт
        </button>
      </div>

      <form
        action={isLogin ? loginAction : signupAction}
        className="auth-form"
      >
        <input name="next" type="hidden" value={nextPath} />
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            name="email"
            placeholder="client@example.com"
            required
            type="email"
          />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            autoComplete={isLogin ? "current-password" : "new-password"}
            minLength={isLogin ? undefined : 6}
            name="password"
            required
            type="password"
          />
        </label>

        <button
          className="button"
          disabled={!supabaseConfigured || pending}
          type="submit"
        >
          {pending
            ? "Отправка..."
            : isLogin
              ? "Войти"
              : "Создать аккаунт"}
        </button>

        {activeState.message ? (
          <p className={messageClassName(activeState)}>{activeState.message}</p>
        ) : null}
      </form>
    </section>
  );
}
