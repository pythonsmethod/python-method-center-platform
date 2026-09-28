import { NextResponse } from "next/server";
import { getBillingSettings } from "@/lib/payments/checkout-settings";
import { stopRenewalAtPeriodEnd } from "@/lib/payments/cancel-renewal";
import { getStripe } from "@/lib/payments/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";

export const runtime = "nodejs";

// Client turns off automatic renewal from the cabinet. The subscription is
// always the caller's own: it is looked up by the signed-in user id, never
// taken from the form.
export async function POST(request: Request) {
  const settings = getBillingSettings();
  if (!settings) return NextResponse.json({ error: "service-unavailable" }, { status: 503 });
  if (request.headers.get("origin") !== settings.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const back = (state: string) =>
    NextResponse.redirect(new URL(`/cabinet/account?renewal=${state}`, settings.origin), 303);

  const stripe = getStripe();
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  if (!stripe || !supabase || !service) return back("error");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/cabinet/account", settings.origin), 303);

  const { data: row, error } = await supabase
    .from("billing_subscriptions")
    .select("id, stripe_subscription_id, renewal_cancelled_at")
    .eq("profile_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return back("error");
  if (!row?.stripe_subscription_id) return back("none");
  if (row.renewal_cancelled_at) return back("cancelled");

  let endsAt: Date;
  try {
    endsAt = await stopRenewalAtPeriodEnd(stripe, row.stripe_subscription_id as string);
  } catch {
    return back("error");
  }

  const { error: updateError } = await service
    .from("billing_subscriptions")
    .update({ renewal_cancelled_at: new Date().toISOString(), current_period_end: endsAt.toISOString() })
    .eq("id", row.id)
    .eq("profile_id", user.id);

  await notifyTeam({
    kind: "payment",
    dedupeKey: `renewal-cancelled:${row.stripe_subscription_id}`,
    title: "Клиент отключил автопродление",
    lines: [
      `Subscription: ${row.stripe_subscription_id}`,
      `Оплаченный доступ до: ${endsAt.toISOString().slice(0, 10)}`,
      "Новых списаний не будет.",
      updateError ? `Внимание: в Stripe отключено, но отметка в базе не сохранилась (${updateError.message}).` : null
    ],
    link: adminLink("/admin/cases")
  });

  return back("cancelled");
}
