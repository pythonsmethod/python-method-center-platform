"use server";

import { paymentProductLabel } from "@/lib/i18n/status-labels";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// A PayPal payment never reaches the Stripe webhook, so the platform would
// otherwise learn nothing. This fires the moment the person leaves for
// PayPal: the team knows whom to expect and can confirm the money in
// minutes instead of watching the PayPal inbox all day.
//
// Never throws and never blocks: the person must reach PayPal regardless.
export async function announcePaypalIntent(product: string): Promise<void> {
  try {
    let email: string | null = null;

    const supabase = await createSupabaseServerClient();

    if (supabase) {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      email = user?.email ?? null;
    }

    await notifyTeam({
      kind: "payment",
      // One ping per person and product per hour: leaving and returning to
      // the page must not spam the team.
      dedupeKey: `paypal_intent:${email ?? "guest"}:${product}:${Math.floor(
        Date.now() / 3_600_000
      )}`,
      title: "💙 Человек ушёл платить через PayPal",
      lines: [
        `Тариф: ${paymentProductLabel(product)}`,
        email ? `Аккаунт: ${email}` : "Гость — оплата будет без привязки к аккаунту",
        "Проверьте PayPal. Ручная запись оплаты на сайте отключена."
      ],
      link: adminLink("/admin/cases")
    });
  } catch {
    // Best-effort by design.
  }
}
