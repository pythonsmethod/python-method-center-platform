import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function caseEvidenceFingerprint(caseId: string): Promise<string | null> {
  const db = createSupabaseServiceClient();
  if (!db) return null;
  const { data, error } = await db.rpc("pmc_case_evidence_fingerprint", { p_case_id: caseId });
  return !error && typeof data === "string" && /^pmc1:[a-f0-9]{32}$/.test(data) ? data : null;
}
