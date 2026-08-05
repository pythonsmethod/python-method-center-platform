import { referralTokensForAmount } from "@/lib/tokens/config";
import { TOKEN_REASONS, writeTokenTransaction } from "@/lib/tokens/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Called after a payment is recorded: if the payer was invited by someone,
// the referrer earns a share of it in tokens.
//
// It used to be a flat reward, once per invited person no matter how much
// or how often they paid. It is now a share of each payment — so a person
// who keeps buying keeps earning for whoever brought them, and the amount
// follows what was actually spent.
//
// The source event is therefore the payment, not the referral: one reward
// per payment, and a redelivered webhook still cannot pay twice, because
// the ledger's unique index refuses the same reference a second time.
//
// Never throws: a reward failure must not affect payment processing.
export async function awardReferralTokensForPayment(input: {
  payerProfileId: string;
  paymentId: string;
  amountCents: number;
}): Promise<void> {
  try {
    const amount = referralTokensForAmount(input.amountCents);

    if (amount <= 0) {
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
      amount,
      reason: TOKEN_REASONS.referralPaid,
      referenceId: input.paymentId,
      note: `Оплата приглашённого · ${input.paymentId}`
    });
  } catch {
    // Best-effort by design.
  }
}
