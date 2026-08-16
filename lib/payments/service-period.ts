import type { createSupabaseServiceClient } from "@/lib/supabase/service";
import { PLAN_DURATION_DAYS, type ServicePeriodProduct } from "@/lib/payments/stripe";

// Opening the support period is what actually turns a payment into access.
//
// Until now only the Stripe webhook did it. A payment recorded by hand on
// the case page — the path for everyone who cannot pay by card, which is
// every client in Russia and Belarus — wrote the money and stopped there:
// the payment showed in the case, and the client's plan stayed switched
// off. Money taken, nothing delivered, and nothing in the interface saying
// so.
//
// So both paths now come through here, and the renewal rule lives in one
// place with them. Clause 3 of the contract says a programme can be
// extended as many times as the client needs; a renewal bought before the
// current period runs out therefore starts when that one ends, not today.
// Starting it today would silently burn the days already paid for.

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

export type ServicePeriodOutcome =
  | { status: "opened"; endsAt: string }
  | { status: "extended"; endsAt: string }
  // The free preliminary assessment buys no period, and saying so is not
  // the same as failing.
  | { status: "not-applicable" }
  | { status: "failed"; message: string };

export function isPlanProduct(product: string): product is ServicePeriodProduct {
  return product in PLAN_DURATION_DAYS;
}

function addDays(from: Date, days: number): Date {
  const end = new Date(from);
  end.setUTCDate(end.getUTCDate() + days);
  return end;
}

export async function openServicePeriod(
  supabase: ServiceClient,
  input: {
    profileId: string;
    caseId: string;
    paymentId: string;
    product: string;
    paidAt: Date;
  }
): Promise<ServicePeriodOutcome> {
  const { profileId, caseId, paymentId, product, paidAt } = input;

  if (!isPlanProduct(product)) {
    return { status: "not-applicable" };
  }

  // A period still running means this payment is a renewal.
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
  const endsAt = addDays(startsAt, PLAN_DURATION_DAYS[product]);

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
