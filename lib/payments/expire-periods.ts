import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function expireElapsedServicePeriods(now = new Date()): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from("service_periods")
    .update({ status: "completed" })
    .eq("status", "active")
    .lte("ends_at", now.toISOString())
    .select("id");

  if (error) throw new Error(`service period expiry failed: ${error.message}`);
  return data?.length ?? 0;
}
