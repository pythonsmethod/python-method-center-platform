import { NextResponse } from "next/server";
import { getLocale } from "@/lib/i18n/locale";
import { getBillingSettings } from "@/lib/payments/checkout-settings";
import { ensurePortalConfiguration } from "@/lib/payments/checkout-catalog";
import { getStripe } from "@/lib/payments/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const settings = getBillingSettings();
  if (!settings) return NextResponse.json({ error: "service-unavailable" }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin !== settings.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const stripe = getStripe();
  const supabase = await createSupabaseServerClient();

  if (!stripe || !supabase) {
    return NextResponse.json({ error: "service-unavailable" }, { status: 503 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/cabinet/account", settings.origin),
      303
    );
  }

  const { data: subscription, error } = await supabase
    .from("billing_subscriptions")
    .select("stripe_customer_id, status")
    .eq("profile_id", user.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !subscription?.stripe_customer_id) {
    return NextResponse.redirect(
      new URL("/cabinet/account?billing=unavailable", settings.origin),
      303
    );
  }

  try {
    const locale = await getLocale();
    const configuration = await ensurePortalConfiguration(stripe, settings.origin, locale);
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id as string,
      configuration, locale,
      return_url: `${settings.origin}/cabinet/account`
    });
    return NextResponse.redirect(session.url, 303);
  } catch {
    return NextResponse.redirect(new URL("/cabinet/account?billing=unavailable", settings.origin), 303);
  }
}
