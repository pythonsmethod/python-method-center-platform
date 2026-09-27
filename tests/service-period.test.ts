import { describe, expect, it } from "vitest";
import { isPlanProduct, openServicePeriod } from "@/lib/payments/service-period";

type Row = Record<string, unknown>;

function fakeSupabase(options: {
  activeEndsAt?: string;
  existingPaymentEndsAt?: string;
  insertError?: string;
} = {}) {
  const inserted: Row[] = [];
  const client = {
    from(table: string) {
      if (table !== "service_periods") throw new Error(`unexpected table: ${table}`);
      let paymentLookup = false;
      const query = {
        select: () => query,
        eq: (column: string) => {
          if (column === "payment_id") paymentLookup = true;
          return query;
        },
        gt: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({
          data: paymentLookup
            ? options.existingPaymentEndsAt
              ? { ends_at: options.existingPaymentEndsAt }
              : null
            : options.activeEndsAt
              ? { ends_at: options.activeEndsAt }
              : null
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
    (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000
  );
}

describe("Personal Support service periods", () => {
  it("opens 30 days for one paid month", async () => {
    const { client, inserted } = fakeSupabase();
    const paidAt = new Date("2026-09-19T12:00:00.000Z");

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "personal_support",
      paidAt,
      months: 1
    });

    expect(result.status).toBe("opened");
    expect(daysBetween(paidAt.toISOString(), inserted[0].ends_at as string)).toBe(30);
    expect(inserted[0].payment_id).toBe(BASE.paymentId);
  });

  it("opens the whole prepaid term at once", async () => {
    const { client, inserted } = fakeSupabase();
    const paidAt = new Date("2026-09-19T12:00:00.000Z");

    await openServicePeriod(client, {
      ...BASE,
      product: "personal_support",
      paidAt,
      months: 6
    });

    expect(daysBetween(paidAt.toISOString(), inserted[0].ends_at as string)).toBe(180);
  });

  it("adds a renewal after the existing paid term instead of burning days", async () => {
    const { client, inserted } = fakeSupabase({
      activeEndsAt: "2026-12-18T12:00:00.000Z"
    });

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "personal_support",
      paidAt: new Date("2026-11-19T12:00:00.000Z"),
      months: 1
    });

    expect(result.status).toBe("extended");
    expect(inserted[0].starts_at).toBe("2026-12-18T12:00:00.000Z");
    expect(daysBetween(inserted[0].starts_at as string, inserted[0].ends_at as string)).toBe(30);
  });

  it("uses Stripe's paid period exactly even when the webhook arrives later", async () => {
    const { client, inserted } = fakeSupabase();
    const startsAt = new Date("2026-09-24T01:13:18.000Z");
    const endsAt = new Date("2026-10-24T01:13:18.000Z");
    await openServicePeriod(client, {
      ...BASE, product: "personal_support", months: 1,
      paidAt: new Date("2026-09-24T01:35:34.000Z"),
      stripePeriod: { startsAt, endsAt }
    });
    expect(inserted[0].starts_at).toBe(startsAt.toISOString());
    expect(inserted[0].ends_at).toBe(endsAt.toISOString());
  });

  it("fails closed if a Stripe subscription would overlap paid access", async () => {
    const { client, inserted } = fakeSupabase({ activeEndsAt: "2026-10-24T02:00:00.000Z" });
    const result = await openServicePeriod(client, {
      ...BASE, product: "personal_support", months: 1,
      paidAt: new Date("2026-09-24T01:35:34.000Z"),
      stripePeriod: {
        startsAt: new Date("2026-09-24T01:13:18.000Z"),
        endsAt: new Date("2026-10-24T01:13:18.000Z")
      }
    });
    expect(result).toEqual({ status: "failed", message: "Stripe paid period overlaps existing paid access" });
    expect(inserted).toHaveLength(0);
  });

  it("reports an insertion failure instead of pretending access is open", async () => {
    const { client } = fakeSupabase({ insertError: "permission denied" });

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "personal_support",
      paidAt: new Date("2026-09-19T12:00:00.000Z"),
      months: 1
    });

    expect(result).toEqual({ status: "failed", message: "permission denied" });
  });

  it("does not grant the same payment twice on webhook retry", async () => {
    const { client, inserted } = fakeSupabase({
      existingPaymentEndsAt: "2026-10-19T12:00:00.000Z"
    });

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "personal_support",
      paidAt: new Date("2026-09-19T12:00:00.000Z"),
      months: 1
    });

    expect(result).toEqual({
      status: "already-applied",
      endsAt: "2026-10-19T12:00:00.000Z"
    });
    expect(inserted).toHaveLength(0);
  });
});

describe("product boundaries and legacy compatibility", () => {
  it("opens no support period for the one-time assessment", async () => {
    const { client, inserted } = fakeSupabase();

    const result = await openServicePeriod(client, {
      ...BASE,
      product: "preliminary_assessment",
      paidAt: new Date("2026-09-19T12:00:00.000Z")
    });

    expect(result).toEqual({ status: "not-applicable" });
    expect(inserted).toHaveLength(0);
  });

  it("recognises current support and historical periods", () => {
    expect(isPlanProduct("personal_support")).toBe(true);
    expect(isPlanProduct("support_5_weeks")).toBe(true);
    expect(isPlanProduct("support_15_weeks")).toBe(true);
    expect(isPlanProduct("test_access")).toBe(true);
    expect(isPlanProduct("preliminary_assessment")).toBe(false);
    expect(isPlanProduct("nonsense")).toBe(false);
  });

  it("preserves historical fixed durations", async () => {
    const five = fakeSupabase();
    const hundred = fakeSupabase();
    const paidAt = new Date("2026-08-05T12:00:00.000Z");

    await openServicePeriod(five.client, {
      ...BASE,
      product: "support_5_weeks",
      paidAt
    });
    await openServicePeriod(hundred.client, {
      ...BASE,
      product: "support_15_weeks",
      paidAt
    });

    expect(daysBetween(paidAt.toISOString(), five.inserted[0].ends_at as string)).toBe(35);
    expect(daysBetween(paidAt.toISOString(), hundred.inserted[0].ends_at as string)).toBe(100);
  });
});
