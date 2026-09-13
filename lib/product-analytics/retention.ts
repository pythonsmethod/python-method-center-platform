import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { analyticsEnabled } from "./session";

export type ProductAnalyticsRetentionResult = "disabled" | "completed" | "unavailable";

export async function purgeExpiredProductEvents(now = new Date()): Promise<ProductAnalyticsRetentionResult> {
  if (!analyticsEnabled()) return "disabled";
  try {
    const db = createSupabaseServiceClient();
    if (!db) return "unavailable";
    const cutoff = new Date(now.getTime() - 90 * 86400000).toISOString();
    const { error } = await db.from("product_events").delete().lt("occurred_at", cutoff);
    return error ? "unavailable" : "completed";
  } catch {
    return "unavailable";
  }
}
