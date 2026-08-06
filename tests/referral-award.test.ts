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
// The sign-up reward is the mirror image and needs the opposite guarantee:
// it is filed under the referral id precisely so it can be paid once and
// never again, however many times attribution is attempted.
//
// So both references are asserted directly.

type LedgerEntry = {
  profileId: string;
  amount: number;
  reason: string;
  referenceId?: string | null;
  note?: string | null;
};

const writeTokenTransaction = vi.fn(async (_entry: LedgerEntry) => ({ ok: true }));

const referralRow = {
  id: "ref-1111-1111-1111-111111111111",
  referrer_profile_id: "referrer-2222-2222-2222-222222222222"
};

vi.mock("@/lib/tokens/queries", () => ({
  TOKEN_REASONS: {
    referralSignup: "referral_signup",
    referralPaid: "referral_paid"
  },
  writeTokenTransaction: (entry: LedgerEntry) => writeTokenTransaction(entry)
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

const { awardReferralTokensForPayment, awardReferralTokensForSignup } =
  await import("@/lib/tokens/award");

beforeEach(() => {
  writeTokenTransaction.mockClear();
});

describe("who gets paid, and for what", () => {
  it("files the reward under the payment, so every purchase pays", () => {
    return awardReferralTokensForPayment({
      payerProfileId: "payer-3333-3333-3333-333333333333",
      paymentId: "payment-4444-4444-4444-444444444444"
    }).then(() => {
      expect(writeTokenTransaction).toHaveBeenCalledTimes(1);

      const [entry] = writeTokenTransaction.mock.calls[0];

      expect(entry.referenceId).toBe("payment-4444-4444-4444-444444444444");
      // Filing under the referral would cap the referrer at one reward for
      // the lifetime of the person they invited.
      expect(entry.referenceId).not.toBe(referralRow.id);
    });
  });

  it("pays the referrer ten tokens for a purchase, never the buyer", () => {
    return awardReferralTokensForPayment({
      payerProfileId: "payer-3333-3333-3333-333333333333",
      paymentId: "payment-4444-4444-4444-444444444444"
    }).then(() => {
      const [entry] = writeTokenTransaction.mock.calls[0];

      expect(entry.profileId).toBe(referralRow.referrer_profile_id);
      expect(entry.amount).toBe(10);
    });
  });
});

describe("the reward for a registration", () => {
  it("pays the referrer a single token", () => {
    return awardReferralTokensForSignup({
      referralId: referralRow.id,
      referrerProfileId: referralRow.referrer_profile_id
    }).then(() => {
      expect(writeTokenTransaction).toHaveBeenCalledTimes(1);

      const [entry] = writeTokenTransaction.mock.calls[0];

      expect(entry.profileId).toBe(referralRow.referrer_profile_id);
      expect(entry.amount).toBe(1);
      expect(entry.reason).toBe("referral_signup");
    });
  });

  // The whole defence against farming empty accounts. Filed under the
  // referral, whose row carries a unique constraint on the invited person,
  // a registration can be paid exactly once however often it is retried.
  it("files under the referral, so a registration can only pay once", () => {
    return awardReferralTokensForSignup({
      referralId: referralRow.id,
      referrerProfileId: referralRow.referrer_profile_id
    }).then(() => {
      const [entry] = writeTokenTransaction.mock.calls[0];

      expect(entry.referenceId).toBe(referralRow.id);
    });
  });
});
