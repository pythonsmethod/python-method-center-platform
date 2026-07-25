import { TOKENS_PER_PAID_REFERRAL } from "@/lib/tokens/config";
import { TOKEN_REASONS, writeTokenTransaction } from "@/lib/tokens/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Called after a payment is recorded: if the payer was invited by someone,
// the referrer earns tokens — once per invited person, no matter how many
// times that person pays. Never throws: a reward failure must not affect
// payment processing.
export async function awardReferralTokensForPayment(input: {
  payerProfileId: string;
  paymentId: string;
}): Promise<void> {
  try {
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
      amount: TOKENS_PER_PAID_REFERRAL,
      reason: TOKEN_REASONS.referralPaid,
      // One reward per invited person: the referral row is the source event.
      referenceId: referral.id,
      note: `Оплата приглашённого · ${input.paymentId}`
    });
  } catch {
    // Best-effort by design.
  }
}
