// Stripe event ledger with a claim that can expire.
//
// Previously the row was inserted before processing and deleted only from a
// catch block. If the serverless function was killed (timeout, crash) the row
// stayed, and every Stripe retry was answered "duplicate" — the payment was
// silently never fulfilled. Now a row counts as done only once processed_at is
// set; an unfinished claim older than STALE_CLAIM_MS may be taken over.

export const STALE_CLAIM_MS = 10 * 60 * 1000;

type LedgerError = { code?: string; message?: string } | null;
// Structural type so both the service client and small test doubles fit.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LedgerClient = { from: (table: "stripe_events") => any };

export type ClaimResult = "claimed" | "duplicate" | "in-progress" | "unavailable";

export async function claimStripeEvent(
  supabase: LedgerClient,
  event: { id: string; type: string },
  now = new Date()
): Promise<ClaimResult> {
  const { error } = await supabase.from("stripe_events")
    .insert({ id: event.id, type: event.type }) as { error: LedgerError };
  if (!error) return "claimed";
  if (error.code !== "23505") return "unavailable";

  const { data: row, error: readError } = await supabase.from("stripe_events")
    .select("created_at, processed_at").eq("id", event.id).maybeSingle() as {
      data: { created_at: string; processed_at: string | null } | null; error: LedgerError;
    };
  // Before the migration is applied the column is missing: keep old behaviour.
  if (readError || !row) return "duplicate";
  if (row.processed_at) return "duplicate";

  const claimedAt = new Date(row.created_at).getTime();
  if (!Number.isFinite(claimedAt) || now.getTime() - claimedAt < STALE_CLAIM_MS) {
    // Another delivery may still be working. Stripe retries a non-2xx later.
    return "in-progress";
  }

  // Compare-and-swap on the old timestamp: only one retry takes a stale claim.
  const { data: taken, error: takeError } = await supabase.from("stripe_events")
    .update({ created_at: now.toISOString() })
    .eq("id", event.id).is("processed_at", null).eq("created_at", row.created_at)
    .select("id") as { data: unknown[] | null; error: LedgerError };
  if (takeError) return "unavailable";
  return taken && taken.length > 0 ? "claimed" : "in-progress";
}

export async function markStripeEventProcessed(supabase: LedgerClient, eventId: string, now = new Date()) {
  // Failure here is tolerable: a later redelivery reprocesses, and every
  // downstream write is idempotent by processor_reference / payment_id.
  try {
    await supabase.from("stripe_events").update({ processed_at: now.toISOString() }).eq("id", eventId);
  } catch {
    // The event was fully handled; never turn that into a Stripe retry.
  }
}
