import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured?.startsWith("https://")) {
    return configured.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
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
      new URL("/login?next=/cabinet/account", siteOrigin(request)),
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
      new URL("/cabinet/account?billing=unavailable", siteOrigin(request)),
      303
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id as string,
    return_url: `${siteOrigin(request)}/cabinet/account`
  });

  return NextResponse.redirect(session.url, 303);
}
