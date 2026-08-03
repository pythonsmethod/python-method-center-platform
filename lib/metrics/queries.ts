import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MetricRow } from "@/components/cabinet/MetricsPanel";

export type MetricsResult =
  | { status: "ready"; rows: MetricRow[] }
  | { status: "unavailable" };

// Read under the person's own session — RLS returns only their rows.
export async function getHealthMetrics(): Promise<MetricsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "unavailable" };
  }

  const { data, error } = await supabase
    .from("health_metrics")
    .select("id, metric_name, value, unit, measured_at")
    .order("measured_at", { ascending: true })
    .limit(1000);

  if (error) {
    return { status: "unavailable" };
  }

  return { status: "ready", rows: (data ?? []) as MetricRow[] };
}
