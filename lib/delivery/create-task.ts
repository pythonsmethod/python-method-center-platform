import { formatDeliveryAddress, isDeliveryProfileComplete } from "@/lib/delivery/profile";
import { DELIVERY_PROFILE_COLUMNS, type DeliveryProfile } from "@/lib/delivery/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

export async function findActiveDeliveryVolunteer(db: ServiceClient, countryCode: string) {
  const { data } = await db.from("volunteer_assignments")
    .select("profile_id").eq("country_code", countryCode)
    .eq("active", true).maybeSingle();
  return data;
}

// Idempotent: payment_id is unique, so webhook retries and a later address
// correction cannot create duplicate delivery work.
export async function ensureDeliveryTaskForPayment(
  db: ServiceClient,
  input: { paymentId: string; profileId: string; caseId: string | null; product?: string }
) {
  if (input.product && !["support_5_weeks", "support_15_weeks"].includes(input.product)) return { status: "not-applicable" as const };
  const { data: profile } = await db.from("profiles")
    .select(DELIVERY_PROFILE_COLUMNS).eq("id", input.profileId).maybeSingle();
  const delivery = profile as unknown as DeliveryProfile | null;
  if (!delivery || !isDeliveryProfileComplete(delivery)) return { status: "address-required" as const };
  const assignment = await findActiveDeliveryVolunteer(db, delivery.delivery_country_code!);
  if (!assignment) return { status: "volunteer-required" as const };

  const { data, error } = await db.from("delivery_tasks").upsert({
    volunteer_id: assignment.profile_id,
    payment_id: input.paymentId,
    client_profile_id: input.profileId,
    case_id: input.caseId,
    country_code: delivery.delivery_country_code,
    recipient_name: `${delivery.delivery_first_name} ${delivery.delivery_last_name}`,
    recipient_email: delivery.delivery_email,
    recipient_phone: delivery.delivery_phone,
    delivery_address: formatDeliveryAddress(delivery),
    delivery_instructions: delivery.delivery_instructions,
    quantity: 1
  }, { onConflict: "payment_id", ignoreDuplicates: true }).select("id").maybeSingle();
  return error ? { status: "error" as const, message: error.message } : { status: "ready" as const, id: data?.id ?? null };
}
