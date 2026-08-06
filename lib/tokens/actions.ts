"use server";

import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/payments/stripe";
import {
  MIN_REDEEM_TOKENS,
  REDEEM_CODE_VALID_DAYS,
  formatUsd,
  pluralTokens,
  tokensToUsd
} from "@/lib/tokens/config";
import {
  getTokenBalance,
  TOKEN_REASONS,
  writeTokenTransaction
} from "@/lib/tokens/queries";
import type { RedeemState } from "@/lib/tokens/redeem-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function errorState(message: string): RedeemState {
  return { status: "error", message };
}

// Turns tokens into a one-time Stripe discount code the client enters at
// checkout. Tokens are deducted only after the code exists; if the ledger
// write fails, the code is deactivated so nothing is given away for free.
export async function redeemTokens(
  _previousState: RedeemState,
  formData: FormData
): Promise<RedeemState> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return errorState("Сервис временно недоступен. Попробуйте позже.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState("Войдите в аккаунт, чтобы использовать токены.");
  }

  const requested = Number(String(formData.get("amount") ?? "").trim());

  if (!Number.isInteger(requested) || requested <= 0) {
    return errorState("Укажите целое количество токенов.");
  }

  if (requested < MIN_REDEEM_TOKENS) {
    return errorState(
      `Минимальная сумма для скидки — ${MIN_REDEEM_TOKENS} токенов.`
    );
  }

  const balance = await getTokenBalance(user.id);

  if (requested > balance) {
    return errorState(
      `На вашем счету ${balance} токенов — этого недостаточно для скидки на ${requested}.`
    );
  }

  const stripe = getStripe();

  if (!stripe) {
    return errorState(
      "Скидочные коды временно недоступны. Напишите команде — мы применим скидку вручную."
    );
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) + REDEEM_CODE_VALID_DAYS * 24 * 60 * 60;

  try {
    // Stripe takes whole cents. tokensToUsd already rounds to the cent, but
    // multiplying a decimal by 100 in floating point does not always land on
    // an integer — and Stripe rejects the request when it does not.
    const amountOffCents = Math.round(tokensToUsd(requested) * 100);

    const coupon = await stripe.coupons.create({
      amount_off: amountOffCents,
      currency: "usd",
      duration: "once",
      max_redemptions: 1,
      redeem_by: expiresAt,
      name: `Токены Python Method · ${requested}`
    });

    const promotionCode = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      max_redemptions: 1,
      expires_at: expiresAt,
      metadata: { profile_id: user.id, tokens: String(requested) }
    });

    const written = await writeTokenTransaction({
      profileId: user.id,
      amount: -requested,
      reason: TOKEN_REASONS.redeemed,
      referenceId: promotionCode.id,
      note: `Код скидки ${promotionCode.code}`
    });

    if (!written.ok) {
      // Could not record the spend — revoke the code so the discount is not
      // handed out without deducting tokens.
      await stripe.promotionCodes
        .update(promotionCode.id, { active: false })
        .catch(() => undefined);

      return errorState(
        "Не удалось списать токены. Код отменён, попробуйте ещё раз."
      );
    }

    revalidatePath("/cabinet");

    return {
      status: "success",
      code: promotionCode.code,
      message: `Код скидки на ${formatUsd(tokensToUsd(requested))} $ создан — это ${requested} ${pluralTokens(requested)}. Введите его на странице оплаты в поле «Промокод». Код действует ${REDEEM_CODE_VALID_DAYS} дней и работает один раз.`
    };
  } catch {
    return errorState(
      "Не удалось создать код скидки. Попробуйте позже или напишите команде."
    );
  }
}
