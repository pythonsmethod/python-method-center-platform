import type { DeliveryProfile } from "@/lib/delivery/types";

const clean = (form: FormData, name: string, max = 300) => String(form.get(name) ?? "").trim().replace(/\s+/g, " ").slice(0, max);

export function readDeliveryProfile(form: FormData) {
  return {
    delivery_first_name: clean(form, "deliveryFirstName", 100),
    delivery_last_name: clean(form, "deliveryLastName", 100),
    delivery_email: clean(form, "deliveryEmail", 254).toLowerCase(),
    delivery_phone: clean(form, "deliveryPhone", 40),
    delivery_country_code: clean(form, "deliveryCountryCode", 2).toUpperCase(),
    delivery_region: clean(form, "deliveryRegion", 160),
    delivery_city: clean(form, "deliveryCity", 160),
    delivery_street: clean(form, "deliveryStreet", 200),
    delivery_building: clean(form, "deliveryBuilding", 80),
    delivery_unit: clean(form, "deliveryUnit", 80) || null,
    delivery_postal_code: clean(form, "deliveryPostalCode", 40),
    delivery_instructions: clean(form, "deliveryInstructions", 1000) || null,
    delivery_confirmed_at: new Date().toISOString()
  };
}

export function isDeliveryProfileComplete(profile: Partial<DeliveryProfile>): boolean {
  return Boolean(
    profile.delivery_first_name?.trim() &&
    profile.delivery_last_name?.trim() &&
    /^\S+@\S+\.\S+$/.test(profile.delivery_email?.trim() ?? "") &&
    /^\+[1-9]\d{6,14}$/.test((profile.delivery_phone ?? "").replace(/[\s()-]/g, "")) &&
    /^[A-Z]{2}$/.test(profile.delivery_country_code ?? "") &&
    profile.delivery_region?.trim() &&
    profile.delivery_city?.trim() &&
    profile.delivery_street?.trim() &&
    profile.delivery_building?.trim() &&
    profile.delivery_postal_code?.trim()
  );
}

export function formatDeliveryAddress(profile: DeliveryProfile): string {
  return [
    profile.delivery_postal_code,
    profile.delivery_country_code,
    profile.delivery_region,
    profile.delivery_city,
    profile.delivery_street,
    profile.delivery_building,
    profile.delivery_unit
  ].filter(Boolean).join(", ");
}

export function deliveryStatusLabel(status: string, locale: "ru" | "en"): string {
  const labels = locale === "ru"
    ? { preparing: "Готовится к отправке", shipped: "Отправлено", problem: "Возникла проблема" }
    : { preparing: "Preparing for shipment", shipped: "Shipped", problem: "There is a problem" };
  return labels[status as keyof typeof labels] ?? status;
}
