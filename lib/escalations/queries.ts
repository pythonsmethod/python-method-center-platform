import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type EscalationListItem = {
  id: string;
  category: string;
  routing_target: string;
  status: string;
  requires_immediate_review: boolean;
  signals: Record<string, unknown>;
  created_at: string;
  profiles: {
    email: string | null;
    full_name: string | null;
  } | null;
};

export type EscalationsResult = {
  escalations: EscalationListItem[];
  error: string | null;
};

export async function listOpenEscalations(): Promise<EscalationsResult> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { escalations: [], error: "Supabase недоступен." };
  }

  const { data, error } = await supabase
    .from("escalation_events")
    .select(
      "id, category, routing_target, status, requires_immediate_review, signals, created_at, profiles(email, full_name)"
    )
    .in("status", ["open", "notified"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return { escalations: [], error: error.message };
  }

  return {
    escalations: (data ?? []) as unknown as EscalationListItem[],
    error: null
  };
}
