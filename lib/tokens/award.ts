import {
  REFERRAL_PURCHASE_TOKENS,
  REFERRAL_SIGNUP_TOKENS
} from "@/lib/tokens/config";
import { TOKEN_REASONS, writeTokenTransaction } from "@/lib/tokens/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Called once, at the moment attribution is recorded: the person who
// invited somebody earns for the registration itself.
//
// This is the rule the programme used to refuse outright, and the reason it
// refused has not stopped being true — paying for an account is paying for
// the making of empty accounts. Two things hold it in place instead:
//
//   - the reward is one token against ten for a purchase, so an account
//     farm earns a dollar a head for work that costs more than a dollar,
//     while a real invitation is worth ten;
//   - the referral row is the source event, and it carries a unique
//     constraint on the invited person. This is called only when the insert
//     actually created a row, so a sign-up can be paid exactly once.
//
// If balances ever start looking strange, look here first. The cheap fix is
// to move the call to the moment the invited person completes onboarding
// rather than the moment they register: same intent, far dearer to fake.
//
// Never throws: a reward failure must not affect sign-up.
export async function awardReferralTokensForSignup(input: {
  referralId: string;
  referrerProfileId: string;
}): Promise<void> {
  try {
    if (REFERRAL_SIGNUP_TOKENS <= 0) {
      return;
    }

    await writeTokenTransaction({
      profileId: input.referrerProfileId,
      amount: REFERRAL_SIGNUP_TOKENS,
      reason: TOKEN_REASONS.referralSignup,
      referenceId: input.referralId,
      note: `Регистрация приглашённого · ${input.referralId}`
    });
  } catch {
    // Best-effort by design.
  }
}

// Called after a payment is recorded: if the payer was invited by someone,
// the referrer earns for it.
//
// A flat reward per payment, not a share of it. The share was expressed in
// capsules and died with that peg; a flat ten is a number the person can
// hold in their head. It applies to every purchase the invited person
// makes, not only their first.
//
// The source event is the payment, not the referral: one reward per
// payment, and a redelivered webhook still cannot pay twice, because the
// ledger's unique index refuses the same reference a second time.
//
// Never throws: a reward failure must not affect payment processing.
export async function awardReferralTokensForPayment(input: {
  payerProfileId: string;
  paymentId: string;
}): Promise<void> {
  try {
    if (REFERRAL_PURCHASE_TOKENS <= 0) {
      return;
    }

    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return;
    }

    const { data: referral } = await supabase
      .from("referrals")
      .select("id, referrer_profile_id")
      .eq("referred_profile_id", input.payerProfileId)
      .maybeSingle();

    if (!referral) {
      return;
    }

    await writeTokenTransaction({
      profileId: referral.referrer_profile_id,
      amount: REFERRAL_PURCHASE_TOKENS,
      reason: TOKEN_REASONS.referralPaid,
      referenceId: input.paymentId,
      note: `Оплата приглашённого · ${input.paymentId}`
    });
  } catch {
    // Best-effort by design.
  }
}
