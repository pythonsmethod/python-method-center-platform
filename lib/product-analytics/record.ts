import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { CONSENT_COOKIE, CONSENT_DENIED_COOKIE, CONSENT_VERSION, JOURNEY_COOKIE, type ProductEvent } from "./contract";
import { readJourney } from "./session";

// Best effort telemetry must never turn a successful registration/message into a failure.
export async function recordProductEvent(event: ProductEvent, locale: "ru" | "en") {
  try {
    const jar = await cookies();
    if (jar.get(CONSENT_DENIED_COOKIE)?.value === "1" || jar.get(CONSENT_COOKIE)?.value !== CONSENT_VERSION) return false;
    const journey = readJourney(jar.get(JOURNEY_COOKIE)?.value);
    if (!journey) return false;
    const db = createSupabaseServiceClient();
    if (!db) return false;
    const { error } = await db.rpc("record_product_event", { p_journey: journey, p_event: event, p_locale: locale });
    return !error;
  } catch {
    return false;
  }
}
