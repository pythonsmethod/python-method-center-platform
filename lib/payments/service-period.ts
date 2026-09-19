import type { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  PLAN_DURATION_DAYS,
  servicePeriodEnd,
  type PeriodProduct
} from "@/lib/payments/stripe";

// Opening the support period is what turns a confirmed payment into access.
// Renewals never burn already-paid time: if an active period still exists,
// the new period starts when the latest active one ends.

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

export type ServicePeriodOutcome =
  | { status: "opened"; endsAt: string }
  | { status: "extended"; endsAt: string }
  | { status: "not-applicable" }
  | { status: "failed"; message: string };

export function isPlanProduct(product: string): product is PeriodProduct {
  return product in PLAN_DURATION_DAYS;
}

export async function openServicePeriod(
  supabase: ServiceClient,
  input: {
    profileId: string;
    caseId: string;
    paymentId: string;
    product: string;
    paidAt: Date;
    months?: number;
  }
): Promise<ServicePeriodOutcome> {
  const { profileId, caseId, paymentId, product, paidAt } = input;

  if (!isPlanProduct(product)) {
    return { status: "not-applicable" };
  }

  const { data: current } = await supabase
    .from("service_periods")
    .select("ends_at")
    .eq("case_id", caseId)
    .eq("status", "active")
    .gt("ends_at", paidAt.toISOString())
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const extending = Boolean(current?.ends_at);
  const startsAt = extending ? new Date(current!.ends_at as string) : paidAt;
  const endsAt = servicePeriodEnd(product, startsAt, input.months ?? 1);

  const { error } = await supabase.from("service_periods").insert({
    profile_id: profileId,
    case_id: caseId,
    payment_id: paymentId,
    product,
    status: "active",
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString()
  });

  if (error) {
    return { status: "failed", message: error.message };
  }

  return {
    status: extending ? "extended" : "opened",
    endsAt: endsAt.toISOString()
  };
}
