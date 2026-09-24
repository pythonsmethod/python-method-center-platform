import type { createSupabaseServiceClient } from "@/lib/supabase/service";

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

// A paid checkout must not depend on the client completing medical intake.
// This creates only the existing Case shell; onboarding later fills it in.
export async function ensureCaseForPaidProfile(db: ServiceClient, profileId: string): Promise<string> {
  const find = () => db.from("client_cases").select("id").eq("profile_id", profileId).maybeSingle();
  const existing = await find();
  if (existing.error) throw new Error(`paid case lookup failed: ${existing.error.message}`);
  if (existing.data?.id) return existing.data.id;

  const created = await db.from("client_cases")
    .insert({ profile_id: profileId })
    .select("id")
    .single();
  if (!created.error && created.data?.id) return created.data.id;

  // A concurrent webhook or onboarding submission may have inserted the
  // single Case for this profile after our read. Reuse it on unique conflict.
  if (created.error?.code === "23505") {
    const winner = await find();
    if (!winner.error && winner.data?.id) return winner.data.id;
  }
  throw new Error(`paid case creation failed: ${created.error?.message ?? "case missing"}`);
}
