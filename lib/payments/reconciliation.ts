import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentReconciliationInput = Record<string, unknown> & {
  stripe_event_id: string;
  status: string;
  reason: string;
  next_action: string;
};

export type PaymentReconciliationResult =
  | { status: "inserted" }
  | { status: "duplicate" }
  | { status: "failed"; error: string };

export async function writePaymentReconciliation(
  supabase: Pick<SupabaseClient, "from">,
  input: PaymentReconciliationInput
): Promise<PaymentReconciliationResult> {
  const { error } = await supabase
    .from("payment_reconciliation_items")
    .insert(input);
  if (!error) return { status: "inserted" };
  if (error.code === "23505") return { status: "duplicate" };
  return {
    status: "failed",
    error: error.message
      .replace(/Bearer\s+\S+|(?:secret|key|token)\s*[=:]\s*\S+/gi, "[redacted]")
      .slice(0, 240)
  };
}
