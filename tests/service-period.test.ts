import { describe, expect, it } from "vitest";
import { isPlanProduct, openServicePeriod } from "@/lib/payments/service-period";

// Opening the support period is what turns a payment into access.
//
// Only the Stripe webhook used to do it. A payment recorded by hand on the
// case page wrote the money and stopped: the case showed "paid" and the
// client's plan stayed switched off, with nothing anywhere saying so. That
// is the path used by everyone whose card cannot leave their country — so
// the clients most likely to be silently left without access were exactly
// the ones who had the hardest time paying in the first place.
//
// Both paths now go through openServicePeriod, and these tests pin what it
// does — including the renewal rule, which decides whether a client keeps
// or loses the days they already paid for.

type Row = Record<string, unknown>;

// The two calls openServicePeriod makes, and nothing else.
function fakeSupabase(options: { activeEndsAt?: string; insertError?: string } = {}) {
  const inserted: Row[] = [];

  const client = {
    from(table: string) {
      if (table !== "service_periods") {
        throw new Error(`unexpected table: ${table}`);
      }

      const query = {
        select: () => query,
        eq: () => query,
        gt: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({
          data: options.activeEndsAt ? { ends_at: options.activeEndsAt } : null
        }),
        insert: async (row: Row) => {
          inserted.push(row);
          return { error: options.insertError ? { message: options.insertError } : null };
        }
      };

      return query;
    }
  };

  return { client: client as never, inserted };
}

const BASE = {
  profileId: "11111111-1111-1111-1111-111111111111",
  caseId: "22222222-2222-2222-2222-222222222222",
  paymentId: "33333333-3333-3333-3333-333333333333"
};

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / (24 * 60 * 60 * 1000)
  );
}

describe("switching the plan on", () => {
  it("opens a period of the right length for the five-week plan", async () => {
    const { client, inserted } = fakeSupabase();
    const paidAt = new Date("2026-08-05T12:00:00.000Z");

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "support_5_weeks",
      paidAt
    });

    expect(result.status).toBe("opened");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].status).toBe("active");
    expect(daysBetween(paidAt.toISOString(), inserted[0].ends_at as string)).toBe(35);
  });

  it("opens a hundred days for the long plan", async () => {
    const { client, inserted } = fakeSupabase();
    const paidAt = new Date("2026-08-05T12:00:00.000Z");

    await openServicePeriod(client, { ...BASE, product: "support_15_weeks", paidAt });

    expect(daysBetween(paidAt.toISOString(), inserted[0].ends_at as string)).toBe(100);
  });

  it("ties the period to the payment that bought it", async () => {
    const { client, inserted } = fakeSupabase();

    await openServicePeriod(client, {
      ...BASE,
      product: "support_5_weeks",
      paidAt: new Date("2026-08-05T12:00:00.000Z")
    });

    expect(inserted[0].payment_id).toBe(BASE.paymentId);
    expect(inserted[0].case_id).toBe(BASE.caseId);
    expect(inserted[0].profile_id).toBe(BASE.profileId);
  });
});

describe("a renewal bought before the current period ends", () => {
  it("starts when the current one ends, not today", async () => {
    // The contract says a programme can be extended as many times as the
    // client needs. Starting the new period today would silently burn the
    // days they have already paid for — and nobody would notice until the
    // client did.
    const { client, inserted } = fakeSupabase({
      activeEndsAt: "2026-09-01T12:00:00.000Z"
    });

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "support_5_weeks",
      paidAt: new Date("2026-08-05T12:00:00.000Z")
    });

    expect(result.status).toBe("extended");
    expect(inserted[0].starts_at).toBe("2026-09-01T12:00:00.000Z");
    expect(daysBetween("2026-09-01T12:00:00.000Z", inserted[0].ends_at as string)).toBe(35);
  });

  it("starts today when nothing is running", async () => {
    const { client, inserted } = fakeSupabase();
    const paidAt = new Date("2026-08-05T12:00:00.000Z");

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "support_5_weeks",
      paidAt
    });

    expect(result.status).toBe("opened");
    expect(inserted[0].starts_at).toBe(paidAt.toISOString());
  });
});

describe("what must not quietly succeed", () => {
  it("reports a failure instead of returning as if access were open", async () => {
    // The money is already taken at this point. A silent failure here is a
    // client who paid and sees an empty cabinet.
    const { client } = fakeSupabase({ insertError: "permission denied" });

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "support_5_weeks",
      paidAt: new Date("2026-08-05T12:00:00.000Z")
    });

    expect(result).toEqual({ status: "failed", message: "permission denied" });
  });

  it("opens no period for the free preliminary assessment", async () => {
    // It buys no support period, and saying so is not the same as failing.
    const { client, inserted } = fakeSupabase();

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "preliminary_assessment",
      paidAt: new Date("2026-08-05T12:00:00.000Z")
    });

    expect(result).toEqual({ status: "not-applicable" });
    expect(inserted).toHaveLength(0);
  });

  it("knows which products carry a period at all", () => {
    expect(isPlanProduct("support_5_weeks")).toBe(true);
    expect(isPlanProduct("support_15_weeks")).toBe(true);
    expect(isPlanProduct("test_access")).toBe(true);
    expect(isPlanProduct("preliminary_assessment")).toBe(false);
    expect(isPlanProduct("nonsense")).toBe(false);
  });
});
