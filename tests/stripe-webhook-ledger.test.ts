import { describe, expect, it, vi } from "vitest";
import { claimStripeEvent, markStripeEventProcessed, STALE_CLAIM_MS } from "@/lib/payments/webhook-ledger";

const now = new Date("2026-09-29T12:00:00Z");
const event = { id: "evt_1", type: "checkout.session.completed" };

function client(opts: {
  insertError?: { code?: string } | null;
  row?: { created_at: string; processed_at: string | null } | null;
  readError?: object | null;
  taken?: unknown[];
}) {
  const update = vi.fn();
  const chain = {
    eq: () => chain, is: () => chain,
    select: async () => ({ data: opts.taken ?? [], error: null }),
    then: (r: (v: unknown) => void) => r({ error: null })
  };
  update.mockReturnValue(chain);
  const table = {
    insert: vi.fn(async () => ({ error: opts.insertError ?? null })),
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.row ?? null, error: opts.readError ?? null }) }) }),
    update
  };
  return { supabase: { from: () => table }, table };
}
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("claimStripeEvent", () => {
  it("claims a new event", async () => {
    expect(await claimStripeEvent(client({}).supabase, event, now)).toBe("claimed");
  });
  it("treats a finished event as duplicate", async () => {
    const { supabase } = client({ insertError: { code: "23505" }, row: { created_at: ago(1000), processed_at: ago(500) } });
    expect(await claimStripeEvent(supabase, event, now)).toBe("duplicate");
  });
  it("asks Stripe to retry while a recent claim is unfinished", async () => {
    const { supabase } = client({ insertError: { code: "23505" }, row: { created_at: ago(60_000), processed_at: null } });
    expect(await claimStripeEvent(supabase, event, now)).toBe("in-progress");
  });
  it("takes over an abandoned claim so the payment is not lost", async () => {
    const { supabase, table } = client({ insertError: { code: "23505" },
      row: { created_at: ago(STALE_CLAIM_MS + 1), processed_at: null }, taken: [{ id: "evt_1" }] });
    expect(await claimStripeEvent(supabase, event, now)).toBe("claimed");
    expect(table.update).toHaveBeenCalledWith({ created_at: now.toISOString() });
  });
  it("lets only one retry take a stale claim", async () => {
    const { supabase } = client({ insertError: { code: "23505" },
      row: { created_at: ago(STALE_CLAIM_MS + 1), processed_at: null }, taken: [] });
    expect(await claimStripeEvent(supabase, event, now)).toBe("in-progress");
  });
  it("keeps the old duplicate rule if the column is not migrated yet", async () => {
    const { supabase } = client({ insertError: { code: "23505" }, readError: { message: "column missing" } });
    expect(await claimStripeEvent(supabase, event, now)).toBe("duplicate");
  });
  it("reports an unavailable ledger", async () => {
    const { supabase } = client({ insertError: { code: "08006" } });
    expect(await claimStripeEvent(supabase, event, now)).toBe("unavailable");
  });
  it("marks an event processed", async () => {
    const { supabase, table } = client({});
    await markStripeEventProcessed(supabase, "evt_1", now);
    expect(table.update).toHaveBeenCalledWith({ processed_at: now.toISOString() });
  });
});
