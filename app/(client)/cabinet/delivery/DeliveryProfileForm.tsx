"use client";
import { useActionState } from "react";
import { DeliveryAddressFields } from "@/components/delivery/DeliveryAddressFields";
import { updateDeliveryProfile } from "@/lib/delivery/actions";
import { initialDeliveryActionState, type DeliveryProfile } from "@/lib/delivery/types";

export function DeliveryProfileForm({ locale, profile }: { locale: "ru" | "en"; profile: DeliveryProfile | null }) {
  const [state, action, pending] = useActionState(updateDeliveryProfile, initialDeliveryActionState);
  const ru = locale === "ru";
  return <form action={action} className="onboarding-form"><DeliveryAddressFields locale={locale} defaults={profile ?? undefined} />
    <button className="button" disabled={pending}>{pending ? (ru ? "Сохраняем…" : "Saving…") : (ru ? "Сохранить адрес" : "Save address")}</button>
    {state.message ? <p className={`form-message form-message--${state.status}`}>{state.message}</p> : null}
  </form>;
}
