import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SERVICE_UNAVAILABLE_MESSAGE } from "@/lib/i18n/messages";

export type ClientPayment = {
  id: string;
  product: string;
  status: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
};

export type ClientPaymentsResult =
  | {
      status: "ready";
      payments: ClientPayment[];
    }
  | {
      status: "error";
      message: string;
    };

export async function getOwnPayments(
  profileId: string
): Promise<ClientPaymentsResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      status: "error",
      message: SERVICE_UNAVAILABLE_MESSAGE
    };
  }

  const { data, error } = await supabase
    .from("payments")
    .select("id, product, status, amount_cents, currency, paid_at, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "ready",
    payments: (data ?? []) as ClientPayment[]
  };
}
