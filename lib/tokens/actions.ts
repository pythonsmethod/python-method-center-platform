"use server";

import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/payments/stripe";
import {
  MIN_REDEEM_TOKENS,
  REDEEM_CODE_VALID_DAYS,
  formatUsd,
  pluralCapsules,
  tokensToUsd
} from "@/lib/tokens/config";
import {
  getTokenBalance,
  TOKEN_REASONS,
  writeTokenTransaction
} from "@/lib/tokens/queries";
import type { RedeemState } from "@/lib/tokens/redeem-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { plural } from "@/lib/i18n/plural";

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
  const locale = await getLocale();
  const error = (ru: string, en: string) => errorState(locale === "ru" ? ru : en);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return error("Сервис временно недоступен. Попробуйте позже.", "The service is temporarily unavailable. Please try again later.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return error("Войдите в аккаунт, чтобы использовать токены.", "Sign in to use your tokens.");
  }

  const requested = Number(String(formData.get("amount") ?? "").trim());

  if (!Number.isInteger(requested) || requested <= 0) {
    return error("Укажите целое количество токенов.", "Enter a whole number of tokens.");
  }

  if (requested < MIN_REDEEM_TOKENS) {
    return error(`Минимальная сумма для скидки — ${MIN_REDEEM_TOKENS} токенов.`, `The minimum redemption is ${MIN_REDEEM_TOKENS} tokens.`);
  }

  const balance = await getTokenBalance(user.id);

  if (requested > balance) {
    return error(
      `На вашем счету ${balance} токенов — этого недостаточно для скидки на ${requested}.`,
      `Your balance is ${balance} ${plural(balance, { rule: "en", one: "token", few: "tokens", many: "tokens" })}, which is not enough to redeem ${requested}.`
    );
  }

  const stripe = getStripe();

  if (!stripe) {
    return error("Скидочные коды временно недоступны. Напишите команде — мы применим скидку вручную.", "Discount codes are temporarily unavailable. Message the team and we’ll apply your discount manually.");
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
      name: locale === "ru" ? `Токены Python Method · ${requested}` : `Python Method tokens · ${requested}`
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
      note: locale === "ru" ? `Код скидки ${promotionCode.code}` : `Discount code ${promotionCode.code}`
    });

    if (!written.ok) {
      // Could not record the spend — revoke the code so the discount is not
      // handed out without deducting tokens.
      await stripe.promotionCodes
        .update(promotionCode.id, { active: false })
        .catch(() => undefined);

      return error("Не удалось списать токены. Код отменён, попробуйте ещё раз.", "Could not redeem your tokens. The code was cancelled; please try again.");
    }

    revalidatePath("/cabinet");

    return {
      status: "success",
      code: promotionCode.code,
      message: locale === "ru"
        ? `Код скидки на ${formatUsd(tokensToUsd(requested))} $ создан — это ${requested} ${pluralCapsules(requested)} формулы по сегодняшней цене. Введите его на странице оплаты в поле «Промокод». Код действует ${REDEEM_CODE_VALID_DAYS} дней и работает один раз.`
        : `Your $${formatUsd(tokensToUsd(requested))} discount code is ready — equal to ${requested} ${plural(requested, { rule: "en", one: "formula capsule", few: "formula capsules", many: "formula capsules" })} at today’s price. Enter it in the “Promotion code” field on the payment page. The code is valid for ${REDEEM_CODE_VALID_DAYS} ${plural(REDEEM_CODE_VALID_DAYS, { rule: "en", one: "day", few: "days", many: "days" })} and can be used once.`
    };
  } catch {
    return error("Не удалось создать код скидки. Попробуйте позже или напишите команде.", "Could not create a discount code. Try again later or message the team.");
  }
}
