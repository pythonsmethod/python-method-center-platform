import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type MaintenanceExpiryResult = {
  expiredPeriods: number;
  lifecycleEvents: number;
  casesAligned: number;
};

export async function expireElapsedServicePeriods(
  now = new Date()
): Promise<MaintenanceExpiryResult> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("service period expiry failed: service client unavailable");
  }

  const { data, error } = await supabase.rpc("run_operational_maintenance", {
    maintenance_now: now.toISOString()
  });

  if (error) throw new Error(`service period expiry failed: ${error.message}`);

  const result = (data ?? {}) as Record<string, unknown>;
  return {
    expiredPeriods: Number(result.expired_periods ?? 0),
    lifecycleEvents: Number(result.lifecycle_events ?? 0),
    casesAligned: Number(result.cases_aligned ?? 0)
  };
}
