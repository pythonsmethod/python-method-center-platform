"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getRequiredVolunteer } from "@/lib/auth/require-volunteer";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { ensureDeliveryTaskForPayment, findActiveDeliveryVolunteer } from "@/lib/delivery/create-task";
import { formatDeliveryAddress, isDeliveryProfileComplete, readDeliveryProfile } from "@/lib/delivery/profile";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getLocale } from "@/lib/i18n/locale";
import type { DeliveryActionState } from "@/lib/delivery/types";

const clean = (form: FormData, name: string, max = 300) => String(form.get(name) ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export async function updateDeliveryProfile(_: DeliveryActionState, form: FormData): Promise<DeliveryActionState> {
  const auth = await getRequiredUser("/cabinet/delivery");
  const ru = await getLocale() === "ru";
  if (auth.status === "missing-env") return { status: "error", message: ru ? "Сервис временно недоступен." : "Service unavailable." };
  const profile = readDeliveryProfile(form);
  if (!isDeliveryProfileComplete(profile)) return { status: "error", message: ru ? "Заполните все обязательные поля. Телефон должен начинаться с + и кода страны." : "Complete all required fields. The phone number must begin with + and the country code." };
  const db = createSupabaseServiceClient();
  if (!db) return { status: "error", message: ru ? "Сервис временно недоступен." : "Service unavailable." };
  const { error } = await db.from("profiles").update(profile).eq("id", auth.userId);
  if (error) return { status: "error", message: error.message };

  const assignment = await findActiveDeliveryVolunteer(db, profile.delivery_country_code);
  const pendingTaskUpdate = {
    ...(assignment ? { volunteer_id: assignment.profile_id, status: "preparing" } : { status: "problem" }),
    country_code: profile.delivery_country_code,
    recipient_name: `${profile.delivery_first_name} ${profile.delivery_last_name}`,
    recipient_email: profile.delivery_email,
    recipient_phone: profile.delivery_phone,
    delivery_address: formatDeliveryAddress(profile),
    delivery_instructions: profile.delivery_instructions
  };
  await db.from("delivery_tasks").update(pendingTaskUpdate)
    .eq("client_profile_id", auth.userId).in("status", ["preparing", "problem"]);
  const { data: payments } = await db.from("payments").select("*").eq("profile_id", auth.userId).eq("status", "paid");
  await Promise.all((payments ?? []).map(payment => ensureDeliveryTaskForPayment(db, { paymentId: payment.id, profileId: auth.userId, caseId: payment.case_id, product: payment.product })));
  revalidatePath("/cabinet/delivery");
  return { status: "success", message: ru ? "Адрес для доставки сохранён." : "Delivery address saved." };
}

export async function confirmShipment(_: DeliveryActionState, form: FormData): Promise<DeliveryActionState> {
  const auth = await getRequiredVolunteer("/volunteer");
  const ru = await getLocale() === "ru";
  if (auth.status !== "authorized") return { status: "error", message: ru ? "Доступ запрещён." : "Access denied." };
  const taskId = clean(form, "taskId", 36);
  const comment = clean(form, "comment", 1000) || null;
  const file = form.get("document");
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) return { status: "error", message: ru ? "Прикрепите фотографию или PDF до 10 МБ." : "Attach a photo or PDF up to 10 MB." };
  const allowed = ["image/jpeg", "image/png", "image/heic", "image/heif", "application/pdf"];
  if (!allowed.includes(file.type)) return { status: "error", message: ru ? "Допустимы JPG, PNG, HEIC и PDF." : "JPG, PNG, HEIC, and PDF are supported." };
  const db = createSupabaseServiceClient();
  if (!db) return { status: "error", message: "Service unavailable." };
  const { data: task } = await db.from("delivery_tasks").select("id, client_profile_id, case_id, status").eq("id", taskId).eq("volunteer_id", auth.userId).maybeSingle();
  if (!task || task.status !== "preparing") return { status: "error", message: ru ? "Задание уже обработано или не найдено." : "The task was already processed or was not found." };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
  const path = `${taskId}/${crypto.randomUUID()}-${safeName}`;
  const upload = await db.storage.from("shipment-documents").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return { status: "error", message: upload.error.message };
  const shippedAt = new Date().toISOString();
  const { error } = await db.from("delivery_tasks").update({ status: "shipped", shipment_document_path: path, shipment_document_name: file.name.slice(0, 200), volunteer_comment: comment, shipped_at: shippedAt }).eq("id", taskId).eq("volunteer_id", auth.userId);
  if (error) { await db.storage.from("shipment-documents").remove([path]); return { status: "error", message: error.message }; }
  await notifyTeam({ kind: "client_message", dedupeKey: `shipment:${taskId}`, title: "📦 Отправление подтверждено", lines: [comment ? `Комментарий: ${comment}` : null, "Фотография документа доступна Анне и клиенту."], link: adminLink("/admin/fulfillment") });
  revalidatePath("/volunteer"); revalidatePath("/admin/fulfillment"); revalidatePath("/cabinet/delivery");
  return { status: "success", message: ru ? "Отправление подтверждено. Анна и клиент видят документ." : "Shipment confirmed. Anna and the client can now see the document." };
}

export async function inviteDeliveryVolunteer(_: DeliveryActionState, form: FormData): Promise<DeliveryActionState> {
  const auth = await getStaffUserState();
  const ru = await getLocale() === "ru";
  if (auth.status !== "authorized" || auth.role !== "admin") return { status: "error", message: ru ? "Доступ запрещён." : "Access denied." };
  const email = clean(form, "email", 254).toLowerCase();
  const name = clean(form, "name", 160);
  const countryCode = clean(form, "countryCode", 2).toUpperCase();
  const countryName = clean(form, "countryName", 120);
  if (!/^\S+@\S+\.\S+$/.test(email) || !name || !/^[A-Z]{2}$/.test(countryCode) || !countryName) return { status: "error", message: ru ? "Заполните имя, email, страну и двухбуквенный код." : "Enter the name, email, country, and two-letter country code." };
  const db = createSupabaseServiceClient();
  if (!db) return { status: "error", message: "Service unavailable." };
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password`, data: { full_name: name } });
  if (error || !data.user) return { status: "error", message: error?.message ?? "Invite failed." };
  const profile = await db.from("profiles").upsert({ id: data.user.id, email, full_name: name, role: "volunteer", status: "active" }, { onConflict: "id" });
  const assignment = profile.error ? null : await db.from("volunteer_assignments").insert({ profile_id: data.user.id, country_code: countryCode, country_name: countryName });
  if (profile.error || assignment?.error) { await db.auth.admin.deleteUser(data.user.id); return { status: "error", message: profile.error?.message ?? assignment?.error?.message ?? "Could not save volunteer." }; }
  const { data: clients } = await db.from("profiles").select("id").eq("delivery_country_code", countryCode);
  for (const client of clients ?? []) {
    const { data: paid } = await db.from("payments").select("*").eq("profile_id", client.id).eq("status", "paid");
    for (const payment of paid ?? []) await ensureDeliveryTaskForPayment(db, { paymentId: payment.id, profileId: client.id, caseId: payment.case_id, product: payment.product });
  }
  revalidatePath("/admin/fulfillment");
  return { status: "success", message: ru ? "Волонтёр создан, приглашение отправлено." : "Volunteer created and invitation sent." };
}
