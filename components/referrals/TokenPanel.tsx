"use client";

import { useActionState, useState } from "react";
import { redeemTokens } from "@/lib/tokens/actions";
import { initialRedeemState } from "@/lib/tokens/redeem-state";
import {
  formatUsd,
  MIN_REDEEM_TOKENS,
  pluralTokens,
  tokensToUsd
} from "@/lib/tokens/config";
import { reasonLabels, type TokenTransaction } from "@/lib/tokens/queries";

type TokenPanelProps = {
  balance: number;
  transactions: TokenTransaction[];
};

function formatWhen(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
}

export function TokenPanel({ balance, transactions }: TokenPanelProps) {
  const [state, action, pending] = useActionState(
    redeemTokens,
    initialRedeemState
  );
  const [copied, setCopied] = useState(false);
  const canRedeem = balance >= MIN_REDEEM_TOKENS;

  return (
    <div className="tokens">
      <div className="tokens__balance">
        <span className="referral__label">Ваш баланс</span>
        <strong>
          {balance} {pluralTokens(balance)}
        </strong>
        {/* One line, one meaning. The balance used to be shown in capsules
            of the formula first and dollars second; the formula cannot be
            sold yet, so a balance denominated in it promised something we
            might not be able to hand over. A dollar of discount is a
            promise the platform can always keep. */}
        <span className="tokens__value">
          = {formatUsd(tokensToUsd(balance))} $ скидки на любую покупку
        </span>
        <span className="tokens__peg">
          Один токен — один доллар скидки.
        </span>
      </div>

      {state.status === "success" && state.code ? (
        <div className="tokens__code">
          <span className="referral__label">Ваш код скидки</span>
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
            {copied ? "Скопировано ✓" : "Скопировать код"}
          </button>
          <p className="referral__note">{state.message}</p>
        </div>
      ) : (
        <form action={action} className="tokens__form">
          <label className="field">
            <span>Сколько токенов использовать</span>
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
            {pending ? "Создаю код…" : "Получить код скидки"}
          </button>
          {!canRedeem ? (
            <p className="referral__note">
              Скидку можно получить, когда на счету будет хотя бы{" "}
              {MIN_REDEEM_TOKENS} токенов.
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
                {formatWhen(item.created_at)}
              </span>
              <span>{reasonLabels[item.reason] ?? item.reason}</span>
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
