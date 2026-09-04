type OfferConsentRow = {
  id: string;
  version: string;
  accepted_at: string;
  metadata: unknown;
};

export type AcceptedOfferProvenance = {
  version: string;
  consentRecordId: string;
  acceptedAt: string;
};

export function selectAcceptedOfferVersion(
  rows: OfferConsentRow[],
  product: string,
  paidAt: Date
): AcceptedOfferProvenance | null {
  const eligible = rows.filter((row) => {
    const acceptedAt = new Date(row.accepted_at);
    const metadata = row.metadata && typeof row.metadata === "object"
      ? row.metadata as Record<string, unknown>
      : {};
    return Boolean(row.id && row.version.trim()) &&
      !Number.isNaN(acceptedAt.getTime()) &&
      acceptedAt.getTime() <= paidAt.getTime() &&
      metadata.product === product;
  }).sort((a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime());

  if (eligible.length === 0) return null;
  const latestTime = new Date(eligible[0].accepted_at).getTime();
  const latest = eligible.filter((row) => new Date(row.accepted_at).getTime() === latestTime);
  const versions = new Set(latest.map((row) => row.version));
  if (versions.size !== 1) return null;

  return {
    version: latest[0].version,
    consentRecordId: latest[0].id,
    acceptedAt: latest[0].accepted_at
  };
}

export async function resolveAcceptedOfferVersion(
  supabase: SupabaseClient,
  profileId: string,
  product: string,
  paidAt: Date
): Promise<AcceptedOfferProvenance | null> {
  const { data, error } = await supabase
    .from("consent_records")
    .select("id, version, accepted_at, metadata")
    .eq("profile_id", profileId)
    .eq("consent_type", "offer_acceptance")
    .eq("status", "accepted")
    .lte("accepted_at", paidAt.toISOString())
    .contains("metadata", { product })
    .order("accepted_at", { ascending: false });

  if (error || !Array.isArray(data)) return null;
  return selectAcceptedOfferVersion(data as OfferConsentRow[], product, paidAt);
}
import type { SupabaseClient } from "@supabase/supabase-js";
