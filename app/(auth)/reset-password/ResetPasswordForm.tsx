"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import type { AuthActionState } from "@/lib/auth/types";

const initialState: AuthActionState = { status: "idle", message: "" };

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);

  if (state.status === "success") {
    return (
      <div className="auth-form">
        <p className="form-message form-message--success">{state.message}</p>
        <Link className="button" href="/cabinet">
          Перейти в кабинет
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="auth-form">
      <label className="field">
        <span>Новый пароль (не короче 6 символов)</span>
        <input
          autoComplete="new-password"
          minLength={6}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="field">
        <span>Повторите новый пароль</span>
        <input
          autoComplete="new-password"
          minLength={6}
          name="confirm"
          required
          type="password"
        />
      </label>
      <button className="button" disabled={pending} type="submit">
        {pending ? "Сохраняю…" : "Сохранить новый пароль"}
      </button>
      {state.status === "error" ? (
        <p className="form-message form-message--error">
          {state.message} <Link href="/recovery">Запросить новую ссылку</Link>
        </p>
      ) : null}
    </form>
  );
}
