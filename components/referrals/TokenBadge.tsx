import Link from "next/link";
import { pluralTokens } from "@/lib/tokens/config";

// A quiet coin at the top of the cabinet instead of a whole block about
// tokens on the main screen: the balance is always in sight, and the full
// explanation lives one tap away, read once.
export function TokenBadge({ balance }: { balance: number }) {
  return (
    <Link
      aria-label={`Ваши токены: ${balance}. Открыть страницу токенов`}
      className="token-badge"
      href="/cabinet/tokens"
    >
      <span aria-hidden="true" className="token-badge__coin">
        ⊙
      </span>
      <span className="token-badge__value">
        <strong>{balance}</strong>
        <em>{pluralTokens(balance)}</em>
      </span>
    </Link>
  );
}
