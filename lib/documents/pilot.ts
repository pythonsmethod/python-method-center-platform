import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type DocumentChainPilotStatus = "enabled" | "paused" | "legacy" | "unavailable";

// Membership is set by a service-role rollout operation, not guessed from
// the Case number, the owner, or the presence of existing documents.
export async function getDocumentChainPilotStatus(caseId: string): Promise<DocumentChainPilotStatus> {
  const db = createSupabaseServiceClient();
  if (!db) return "unavailable";
  const { data, error } = await db.from("pmc_document_chain_pilot_cases")
    .select("enabled").eq("case_id", caseId).maybeSingle();
  if (error) return "unavailable";
  if (!data) return "legacy";
  return data.enabled ? "enabled" : "paused";
}
