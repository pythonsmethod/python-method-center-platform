"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import { useActionState } from "react";
import { updateProfileDetails } from "@/lib/profile/actions";
import { initialProfileDetailsActionState } from "@/lib/profile/action-state";

type ProfileDetailsFormProps = {
  labels: Dictionary["cabinet"]["profileForm"];
  email: string | null;
  fullName: string | null;
  phone: string | null;
  deliveryAddress: string | null;
};

// The person's own contact card: name, phone, where the formula ships.
// Email is shown but not editable — it is the key to the account, and
// changing keys goes through support, not through a text field.
export function ProfileDetailsForm({
  labels,
  email,
  fullName,
  phone,
  deliveryAddress
}: ProfileDetailsFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileDetails,
    initialProfileDetailsActionState
  );

  // The fields are uncontrolled, so defaultValue only applies when they
  // mount. Without this key, a re-render carrying freshly saved values
  // would leave the old ones sitting in the DOM — the row updated, the
  // page silent, and the address blank again on the next visit. Keying on
  // the saved values remounts the fields exactly when the server has
  // something new to show, and never while someone is typing.
  const savedKey = `${fullName ?? ""}|${phone ?? ""}|${deliveryAddress ?? ""}`;

  return (
    <form action={formAction} className="onboarding-form" key={savedKey}>
      <label className="field">
        <span>{labels.name}</span>
        <input
          defaultValue={fullName ?? ""}
          maxLength={160}
          name="full_name"
          pattern=".*\\S+\\s+\\S+.*"
          placeholder={labels.namePlaceholder}
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>{labels.phone}</span>
        <input
          defaultValue={phone ?? ""}
          maxLength={40}
          name="phone"
          placeholder="+1 424 …"
          type="tel"
        />
      </label>

      <label className="field">
        <span>{labels.address}</span>
        <textarea
          defaultValue={deliveryAddress ?? ""}
          maxLength={600}
          name="delivery_address"
          placeholder={labels.addressPlaceholder}
          rows={3}
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input disabled type="email" value={email ?? ""} />
        <small className="field__hint">
          {labels.emailNote}
        </small>
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? labels.saving : labels.save}
      </button>

      {state.message ? (
        <p
          aria-live="polite"
          role="status"
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
