"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { joinShopWaitlist } from "@/lib/shop/actions";
import { initialShopWaitlistState } from "@/lib/shop/types";

// A card's "tell me" button asks this form to open on that product. The
// two are far apart on the page and the form is a client island, so they
// talk through an event rather than through shared state.
export const SHOP_WAITLIST_EVENT = "shop:waitlist";

export function requestShopWaitlist(itemId: string): void {
  window.dispatchEvent(
    new CustomEvent(SHOP_WAITLIST_EVENT, { detail: { itemId } })
  );
}

type ShopWaitlistProps = {
  labels: Dictionary["shop"]["waitlist"];
  // Value/label pairs in page order, "the whole line" first.
  options: { value: string; label: string }[];
};

export function ShopWaitlist({ labels, options }: ShopWaitlistProps) {
  const [state, formAction, pending] = useActionState(
    joinShopWaitlist,
    initialShopWaitlistState
  );
  const [itemId, setItemId] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onRequest(event: Event) {
      const detail = (event as CustomEvent<{ itemId: string }>).detail;

      setItemId(detail?.itemId ?? "");
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      // Focus after the scroll starts, so the browser does not jump twice.
      window.setTimeout(() => emailRef.current?.focus(), 350);
    }

    window.addEventListener(SHOP_WAITLIST_EVENT, onRequest);

    return () => window.removeEventListener(SHOP_WAITLIST_EVENT, onRequest);
  }, []);

  if (state.status === "success") {
    return (
      <div className="shop-waitlist shop-waitlist--done">
        <span className="panel__label">{labels.doneLabel}</span>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="shop-waitlist" ref={formRef}>
      <span className="panel__label">{labels.label}</span>
      <h2>{labels.title}</h2>
      <p className="shop-waitlist__text">{labels.text}</p>

      <div className="shop-waitlist__row">
        <label className="field">
          <span>{labels.itemLabel}</span>
          <select
            name="itemId"
            onChange={(event) => setItemId(event.target.value)}
            value={itemId}
          >
            {options.map((option) => (
              <option key={option.value || "line"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{labels.emailLabel}</span>
          <input
            autoComplete="email"
            name="email"
            placeholder={labels.emailPlaceholder}
            ref={emailRef}
            required
            type="email"
          />
        </label>
      </div>

      {/* Honeypot: humans never see it, bots fill it. */}
      <input
        aria-hidden="true"
        autoComplete="off"
        name="website"
        style={{ display: "none" }}
        tabIndex={-1}
        type="text"
      />

      <label className="checkbox-field">
        <input name="consent" required type="checkbox" />
        <span>{labels.consent}</span>
      </label>

      <button className="button" disabled={pending} type="submit">
        {pending ? labels.submitting : labels.submit}
      </button>

      <p className="shop-waitlist__note">{labels.note}</p>

      {state.status === "error" ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}
    </form>
  );
}
