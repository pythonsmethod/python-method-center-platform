"use client";
import { useActionState } from "react";
import { inviteDeliveryVolunteer } from "@/lib/delivery/actions";
import { initialDeliveryActionState } from "@/lib/delivery/types";
export function InviteVolunteerForm({ locale }: { locale: "ru" | "en" }) {
  const [state, action, pending] = useActionState(inviteDeliveryVolunteer, initialDeliveryActionState); const ru = locale === "ru";
  return <form action={action} className="onboarding-form"><label className="field"><span>{ru ? "Имя волонтёра" : "Volunteer name"}</span><input name="name" required /></label><label className="field"><span>Email</span><input name="email" type="email" required /></label><label className="field"><span>{ru ? "Страна" : "Country"}</span><input name="countryName" required /></label><label className="field"><span>{ru ? "Код страны" : "Country code"}</span><input name="countryCode" maxLength={2} placeholder="KZ" required /></label><button className="button" disabled={pending}>{pending ? (ru ? "Создаём…" : "Creating…") : (ru ? "Создать и пригласить" : "Create and invite")}</button>{state.message ? <p className={`form-message form-message--${state.status}`}>{state.message}</p> : null}</form>;
}
