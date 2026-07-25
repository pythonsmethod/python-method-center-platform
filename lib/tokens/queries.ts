import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type TokenTransaction = {
  id: string;
  amount: number;
  reason: string;
  note: string | null;
  created_at: string;
};

export type TokenLedger = {
  status: "ready" | "unavailable";
  balance: number;
  earned: number;
  spent: number;
  transactions: TokenTransaction[];
};

export const TOKEN_REASONS = {
  referralPaid: "referral_paid",
  redeemed: "redeemed",
  manual: "manual_adjustment"
} as const;

export const reasonLabels: Record<string, string> = {
  referral_paid: "Приглашённый начал сопровождение",
  redeemed: "Использовано как скидка",
  manual_adjustment: "Начисление от команды"
};

export async function getTokenLedger(profileId: string): Promise<TokenLedger> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { status: "unavailable", balance: 0, earned: 0, spent: 0, transactions: [] };
  }

  const { data, error } = await supabase
    .from("token_transactions")
    .select("id, amount, reason, note, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { status: "unavailable", balance: 0, earned: 0, spent: 0, transactions: [] };
  }

  const transactions = (data ?? []) as TokenTransaction[];
  const earned = transactions
    .filter((row) => row.amount > 0)
    .reduce((sum, row) => sum + row.amount, 0);
  const spent = transactions
    .filter((row) => row.amount < 0)
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);

  return { status: "ready", balance: earned - spent, earned, spent, transactions };
}

// Authoritative balance straight from the ledger (not limited to the last
// 50 rows) — used before spending.
export async function getTokenBalance(profileId: string): Promise<number> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return 0;
  }

  const { data } = await supabase
    .from("token_transactions")
    .select("amount")
    .eq("profile_id", profileId);

  return (data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
}

// Writes a ledger entry. Idempotent per (profile, reason, referenceId):
// a repeated call for the same source event is silently ignored.
export async function writeTokenTransaction(input: {
  profileId: string;
  amount: number;
  reason: string;
  referenceId?: string | null;
  note?: string | null;
}): Promise<{ ok: boolean; duplicate?: boolean }> {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return { ok: false };
  }

  const { error } = await supabase.from("token_transactions").insert({
    profile_id: input.profileId,
    amount: input.amount,
    reason: input.reason,
    reference_id: input.referenceId ?? null,
    note: input.note ?? null
  });

  if (error) {
    // 23505 = unique violation: this source event was already recorded.
    if (error.code === "23505") {
      return { ok: true, duplicate: true };
    }

    return { ok: false };
  }

  return { ok: true };
}
