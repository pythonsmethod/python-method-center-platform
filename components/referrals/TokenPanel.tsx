"use client";

import { useActionState, useState } from "react";
import { redeemTokens } from "@/lib/tokens/actions";
import { initialRedeemState } from "@/lib/tokens/redeem-state";
import {
  formatUsd,
  MIN_REDEEM_TOKENS,
  pluralCapsules,
  pluralTokens,
  tokensToCapsules,
  tokensToUsd
} from "@/lib/tokens/config";
import { reasonLabels, type TokenTransaction } from "@/lib/tokens/queries";
import type { Locale } from "@/lib/i18n/locale";

type TokenPanelProps = {
  balance: number;
  transactions: TokenTransaction[];
  locale: Locale;
};

const copy = {
  ru: { balance:"Ваш баланс", formula:"формулы, или", discount:"$ скидки на любую покупку", peg:"Один токен — это одна капсула. Дорожает капсула — дорожают и ваши токены.", code:"Ваш код скидки", copied:"Скопировано ✓", copy:"Скопировать код", amount:"Сколько токенов использовать", creating:"Создаю код…", create:"Получить код скидки", minimum:"Скидку можно получить, когда на счету будет хотя бы", token:"токенов", reasons: reasonLabels },
  en: { balance:"Your balance", formula:"formula capsules, or", discount:"$ off any purchase", peg:"One token equals one capsule. When a capsule becomes more valuable, so do your tokens.", code:"Your discount code", copied:"Copied ✓", copy:"Copy code", amount:"Tokens to use", creating:"Creating code…", create:"Get discount code", minimum:"You can redeem a discount once your balance reaches at least", token:"tokens", reasons:{ referral_paid:"Referral started support", redeemed:"Used as a discount", manual_adjustment:"Credit from the team" } }
} as const;

function formatWhen(value: string, locale: Locale): string {
  return new Date(value).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
}

export function TokenPanel({ balance, transactions, locale }: TokenPanelProps) {
  const t = copy[locale];
  const [state, action, pending] = useActionState(
    redeemTokens,
    initialRedeemState
  );
  const [copied, setCopied] = useState(false);
  const canRedeem = balance >= MIN_REDEEM_TOKENS;

  return (
    <div className="tokens">
      <div className="tokens__balance">
        <span className="referral__label">{t.balance}</span>
        <strong>
          {balance} {locale === "ru" ? pluralTokens(balance) : balance === 1 ? "token" : "tokens"}
        </strong>
        {/* Capsules first, dollars second. The capsule is the promise —
            one token is one capsule and always will be — and the dollar
            figure is only today's translation of it. Showing it the other
            way round would make a rise in the capsule price look like us
            changing the rules. */}
        <span className="tokens__value">
          = {tokensToCapsules(balance)} {locale === "ru" ? pluralCapsules(tokensToCapsules(balance)) : tokensToCapsules(balance) === 1 ? "capsule" : "capsules"} {t.formula} {formatUsd(tokensToUsd(balance))} {t.discount}
        </span>
        <span className="tokens__peg">
          {t.peg}
        </span>
      </div>

      {state.status === "success" && state.code ? (
        <div className="tokens__code">
        <span className="referral__label">{t.code}</span>
          <strong>{state.code}</strong>
          <button
            className="button button--secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.code ?? "");
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // Clipboard unavailable: the code stays on screen.
              }
            }}
            type="button"
          >
            {copied ? t.copied : t.copy}
          </button>
          <p className="referral__note">{state.message}</p>
        </div>
      ) : (
        <form action={action} className="tokens__form">
          <label className="field">
            <span>{t.amount}</span>
            <input
              defaultValue={canRedeem ? balance : MIN_REDEEM_TOKENS}
              max={balance}
              min={MIN_REDEEM_TOKENS}
              name="amount"
              step={1}
              type="number"
            />
          </label>
          <button className="button" disabled={pending || !canRedeem} type="submit">
            {pending ? t.creating : t.create}
          </button>
          {!canRedeem ? (
            <p className="referral__note">
              {t.minimum} {MIN_REDEEM_TOKENS} {t.token}.
            </p>
          ) : null}
          {state.status === "error" ? (
            <p className="form-message form-message--error">{state.message}</p>
          ) : null}
        </form>
      )}

      {transactions.length > 0 ? (
        <ul className="tokens__history">
          {transactions.map((item) => (
            <li key={item.id}>
              <span className="tokens__history-when">
                {formatWhen(item.created_at, locale)}
              </span>
              <span>{t.reasons[item.reason as keyof typeof t.reasons] ?? item.reason}</span>
              <span
                className={
                  item.amount > 0 ? "tokens__plus" : "tokens__minus"
                }
              >
                {item.amount > 0 ? `+${item.amount}` : item.amount}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
