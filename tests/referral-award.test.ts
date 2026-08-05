import { beforeEach, describe, expect, it, vi } from "vitest";

// Every purchase pays the referrer, not only the first one.
//
// That is a decision the founder made explicitly, and it lives in a single
// easily-reversed line: which id the ledger entry is filed under.
//
// The ledger has a unique index on (profile, reason, reference), which is
// what stops a redelivered webhook paying twice. Filing under the referral
// id therefore means one reward per invited person for ever — the old
// behaviour — and filing under the payment id means one reward per payment.
// The two differ by one word and produce completely different economics,
// and neither TypeScript nor a passing build can tell them apart.
//
// So the reference is asserted directly.

const writeTokenTransaction = vi.fn(async () => ({ ok: true }));

const referralRow = {
  id: "ref-1111-1111-1111-111111111111",
  referrer_profile_id: "referrer-2222-2222-2222-222222222222"
};

vi.mock("@/lib/tokens/queries", () => ({
  TOKEN_REASONS: { referralPaid: "referral_paid" },
  writeTokenTransaction: (...args: unknown[]) =>
    writeTokenTransaction(...(args as [])),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: referralRow })
        })
      })
    })
  })
}));

const { awardReferralTokensForPayment } = await import("@/lib/tokens/award");

beforeEach(() => {
  writeTokenTransaction.mockClear();
});

describe("who gets paid, and for what", () => {
  it("files the reward under the payment, so every purchase pays", () => {
    return awardReferralTokensForPayment({
      payerProfileId: "payer-3333-3333-3333-333333333333",
      paymentId: "payment-4444-4444-4444-444444444444",
      amountCents: 144000
    }).then(() => {
      expect(writeTokenTransaction).toHaveBeenCalledTimes(1);

      const entry = writeTokenTransaction.mock.calls[0][0] as Record<string, unknown>;

      expect(entry.referenceId).toBe("payment-4444-4444-4444-444444444444");
      // Filing under the referral would cap the referrer at one reward for
      // the lifetime of the person they invited.
      expect(entry.referenceId).not.toBe(referralRow.id);
    });
  });

  it("pays the referrer, never the buyer", () => {
    return awardReferralTokensForPayment({
      payerProfileId: "payer-3333-3333-3333-333333333333",
      paymentId: "payment-4444-4444-4444-444444444444",
      amountCents: 144000
    }).then(() => {
      const entry = writeTokenTransaction.mock.calls[0][0] as Record<string, unknown>;

      expect(entry.profileId).toBe(referralRow.referrer_profile_id);
      expect(entry.amount).toBe(12);
    });
  });

  it("writes nothing at all when the amount earns nothing", () => {
    return awardReferralTokensForPayment({
      payerProfileId: "payer-3333-3333-3333-333333333333",
      paymentId: "payment-5555-5555-5555-555555555555",
      amountCents: 0
    }).then(() => {
      expect(writeTokenTransaction).not.toHaveBeenCalled();
    });
  });
});
