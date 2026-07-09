"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitOnboarding } from "@/lib/onboarding/actions";
import {
  initialOnboardingActionState,
  type OnboardingProfileDefaults
} from "@/lib/onboarding/types";

type OnboardingFormProps = {
  profileDefaults: OnboardingProfileDefaults;
};

export function OnboardingForm({ profileDefaults }: OnboardingFormProps) {
  const [state, formAction, pending] = useActionState(
    submitOnboarding,
    initialOnboardingActionState
  );

  return (
    <form action={formAction} className="onboarding-form">
      <label className="field">
        <span>Полное имя</span>
        <input
          autoComplete="name"
          defaultValue={profileDefaults.fullName}
          name="fullName"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Телефон</span>
        <input
          autoComplete="tel"
          defaultValue={profileDefaults.phone}
          name="phone"
          required
          type="tel"
        />
      </label>

      <label className="field">
        <span>Для кого запрос</span>
        <select defaultValue="self" name="careRecipientType" required>
          <option value="self">Для себя</option>
          <option value="family_member">Для члена семьи</option>
        </select>
      </label>

      <label className="field">
        <span>Основная цель</span>
        <input
          name="primaryGoal"
          placeholder="Например: восстановление после операции"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Краткое описание ситуации</span>
        <textarea
          name="situationDescription"
          placeholder="Что произошло, какое состояние сейчас, что уже делали"
          required
          rows={5}
        />
      </label>

      <label className="checkbox-field">
        <input name="offerAccepted" required type="checkbox" />
        <span>
          Я принимаю условия{" "}
          <Link href="/legal/offer" target="_blank">
            публичной оферты
          </Link>
          .
        </span>
      </label>

      <label className="checkbox-field">
        <input name="consentAccepted" required type="checkbox" />
        <span>
          Я даю согласие на обработку моих персональных данных и медицинской
          информации для подготовки и ведения кейса.
        </span>
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? "Отправка..." : "Отправить анкету"}
      </button>

      {state.message ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}
    </form>
  );
}
