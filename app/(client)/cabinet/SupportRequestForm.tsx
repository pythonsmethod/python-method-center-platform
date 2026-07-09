"use client";

import { useActionState } from "react";
import { createSupportRequest } from "@/lib/support/actions";
import { initialSupportRequestActionState } from "@/lib/support/types";

export function SupportRequestForm() {
  const [state, formAction, pending] = useActionState(
    createSupportRequest,
    initialSupportRequestActionState
  );

  return (
    <form action={formAction} className="onboarding-form">
      <label className="field">
        <span>Тема</span>
        <input
          maxLength={200}
          name="subject"
          placeholder="Например: вопрос по документам"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Сообщение</span>
        <textarea
          maxLength={5000}
          name="body"
          placeholder="Опишите вопрос — команда ответит вам"
          required
          rows={4}
        />
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? "Отправка..." : "Отправить сообщение"}
      </button>

      {state.message ? (
        <p
          className={`form-message form-message--${
            state.status === "success" ? "success" : "error"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
