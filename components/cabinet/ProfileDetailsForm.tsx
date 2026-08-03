"use client";

import { useActionState } from "react";
import {
  initialProfileDetailsActionState,
  updateProfileDetails
} from "@/lib/profile/actions";

type ProfileDetailsFormProps = {
  email: string | null;
  fullName: string | null;
  phone: string | null;
  deliveryAddress: string | null;
};

// The person's own contact card: name, phone, where the formula ships.
// Email is shown but not editable — it is the key to the account, and
// changing keys goes through support, not through a text field.
export function ProfileDetailsForm({
  email,
  fullName,
  phone,
  deliveryAddress
}: ProfileDetailsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileDetails,
    initialProfileDetailsActionState
  );

  return (
    <form action={formAction} className="onboarding-form">
      <label className="field">
        <span>Имя и фамилия</span>
        <input
          defaultValue={fullName ?? ""}
          maxLength={160}
          name="full_name"
          placeholder="Как к вам обращаться"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Телефон</span>
        <input
          defaultValue={phone ?? ""}
          maxLength={40}
          name="phone"
          placeholder="+1 424 …"
          type="tel"
        />
      </label>

      <label className="field">
        <span>Адрес доставки</span>
        <textarea
          defaultValue={deliveryAddress ?? ""}
          maxLength={600}
          name="delivery_address"
          placeholder={"Страна, город, улица, дом, квартира, индекс.\nСюда придёт формула Professor Python и заказы из магазина."}
          rows={3}
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input disabled type="email" value={email ?? ""} />
        <small className="field__hint">
          Email — это вход в аккаунт. Чтобы его сменить, напишите в поддержку.
        </small>
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? "Сохраняю…" : "Сохранить данные"}
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
