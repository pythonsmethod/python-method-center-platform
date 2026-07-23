import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import {
  getStripe,
  productFromAmount,
  servicePeriodEnd
} from "@/lib/payments/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

export const runtime = "nodejs";

// Stripe webhook: the only trusted source of payment truth. Browser
// redirects are never treated as proof of payment.
//
// Handled events:
// - checkout.session.completed / checkout.session.async_payment_succeeded →
//   automatic payment record + active service period;
// - checkout.session.async_payment_failed / payment_intent.payment_failed →
//   team alert;
// - charge.refunded → payment marked refunded + team alert.
//
// Idempotency: stripe_events insert-first (unique id) rejects redelivered
// events; payments.processor_reference unique index blocks double records.

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "stripe-not-configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing-signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    // 500 → Stripe retries later, when the service is configured again.
    return NextResponse.json({ error: "service-unavailable" }, { status: 500 });
  }

  // Insert-first idempotency: a redelivered event id is a no-op.
  const { error: ledgerError } = await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type });

  if (ledgerError) {
    if (ledgerError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    return NextResponse.json({ error: "ledger-unavailable" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Delayed payment methods complete later via async_payment_succeeded.
        if (session.payment_status === "paid") {
          await handlePaidSession(supabase, session, event.id);
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed": {
        const object = event.data.object as
          | Stripe.Checkout.Session
          | Stripe.PaymentIntent;
        const email =
          "customer_details" in object
            ? object.customer_details?.email
            : (object as Stripe.PaymentIntent).receipt_email;

        await notifyTeam({
          kind: "payment",
          dedupeKey: `payment_failed:${event.id}`,
          title: "⚠️ Оплата не прошла",
          lines: [
            email ? `Email плательщика: ${email}` : null,
            `Событие Stripe: ${event.id}`,
            "Клиенту могла потребоваться помощь с оплатой."
          ],
          link: adminLink("/admin")
        });
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(supabase, charge, event.id);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    await notifyTeam({
      kind: "processing_error",
      dedupeKey: `stripe-processing-error:${event.id}`,
      title: "ОШИБКА ОБРАБОТКИ: событие Stripe не обработано",
      lines: [
        `Событие: ${event.id} (${event.type})`,
        `Ошибка: ${error instanceof Error ? error.message : "неизвестно"}`,
        "Проверьте оплату вручную в Stripe-дэшборде."
      ],
      link: adminLink("/admin")
    });

    // The event stays in stripe_events: we alerted a human instead of
    // letting Stripe retry into the same failure.
    return NextResponse.json({ received: true, alerted: true });
  }

  return NextResponse.json({ received: true });
}

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

async function handlePaidSession(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  const amountCents = session.amount_total ?? 0;
  const currency = (session.currency ?? "usd").toUpperCase();
  const customerEmail = session.customer_details?.email ?? null;
  const reference =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

  // 1) Resolve the client: signed-in checkouts carry the profile id in
  // client_reference_id; guests fall back to a case-insensitive email match.
  let profileId: string | null = null;

  if (session.client_reference_id && isUuid(session.client_reference_id)) {
    const { data: byId } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", session.client_reference_id)
      .maybeSingle();

    profileId = byId?.id ?? null;
  }

  if (!profileId && customerEmail) {
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", customerEmail)
      .maybeSingle();

    profileId = byEmail?.id ?? null;
  }

  const product = productFromAmount(amountCents, session.currency);

  // 2) Unmatched client or unknown amount → loud manual-review alert. Never
  // guess who paid.
  if (!profileId || !product) {
    await notifyTeam({
      kind: "payment",
      dedupeKey: `payment_unmatched:${eventId}`,
      title: "💰 ОПЛАТА ПОЛУЧЕНА — нужна ручная привязка",
      lines: [
        `Сумма: ${(amountCents / 100).toFixed(2)} ${currency}`,
        customerEmail
          ? `Email плательщика: ${customerEmail} (аккаунт ${profileId ? "найден" : "не найден"})`
          : "Email плательщика не передан",
        !product ? "Сумма не совпала ни с одним тарифом" : null,
        `Референс: ${reference}`,
        "Запишите оплату вручную в кейсе клиента."
      ],
      link: adminLink("/admin/cases")
    });
    return;
  }

  const { data: caseRow } = await supabase
    .from("client_cases")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  // 3) Payment record. The unique index on processor_reference makes a
  // concurrent duplicate insert fail closed.
  const paidAt = new Date();
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      profile_id: profileId,
      case_id: caseRow?.id ?? null,
      product,
      status: "paid",
      amount_cents: amountCents,
      currency,
      processor_reference: reference,
      paid_at: paidAt.toISOString(),
      metadata: {
        source: "stripe_webhook",
        stripe_event_id: eventId,
        stripe_session_id: session.id,
        customer_email: customerEmail
      }
    })
    .select("id")
    .single();

  if (paymentError) {
    if (paymentError.code === "23505") {
      // Reference already recorded (e.g. staff entered it manually first).
      return;
    }

    throw new Error(`payment insert failed: ${paymentError.message}`);
  }

  // 4) Service period activation, tied to the payment.
  if (caseRow?.id) {
    const { error: periodError } = await supabase.from("service_periods").insert({
      profile_id: profileId,
      case_id: caseRow.id,
      payment_id: payment.id,
      product,
      status: "active",
      starts_at: paidAt.toISOString(),
      ends_at: servicePeriodEnd(product, paidAt).toISOString()
    });

    if (periodError) {
      await notifyTeam({
        kind: "processing_error",
        dedupeKey: `service-period-failed:${eventId}`,
        title: "ОШИБКА ОБРАБОТКИ: период сопровождения не создан",
        lines: [
          `Оплата ${payment.id} записана, но период сопровождения не активирован.`,
          `Ошибка: ${periodError.message}`,
          "Создайте период вручную."
        ],
        link: adminLink(`/admin/cases/${caseRow.id}`)
      });
    }
  }

  // 5) Team ping about the money.
  await notifyTeam({
    kind: "payment",
    dedupeKey: `payment_recorded:${payment.id}`,
    title: "💰 Оплата получена и записана автоматически",
    lines: [
      `Тариф: ${product === "support_5_weeks" ? "Сопровождение — 5 недель" : "Сопровождение — 100 дней"}`,
      `Сумма: ${(amountCents / 100).toFixed(2)} ${currency}`,
      customerEmail ? `Клиент: ${customerEmail}` : null,
      caseRow?.id
        ? `Кейс: ${caseRow.id} — период сопровождения активирован`
        : "Кейс ещё не создан (клиент не заполнил анкету) — оплата привязана к профилю"
    ],
    link: caseRow?.id ? adminLink(`/admin/cases/${caseRow.id}`) : adminLink("/admin/cases")
  });
}

async function handleRefund(
  supabase: ServiceClient,
  charge: Stripe.Charge,
  eventId: string
) {
  const reference =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;

  if (!reference) {
    return;
  }

  const { data: payment } = await supabase
    .from("payments")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("processor_reference", reference)
    .select("id, profile_id, case_id")
    .maybeSingle();

  await notifyTeam({
    kind: "payment",
    dedupeKey: `payment_refunded:${eventId}`,
    title: "↩️ Возврат по оплате",
    lines: [
      `Референс: ${reference}`,
      payment
        ? `Запись оплаты ${payment.id} помечена как возвращённая`
        : "Запись оплаты с этим референсом не найдена — проверьте вручную",
      charge.billing_details?.email
        ? `Email плательщика: ${charge.billing_details.email}`
        : null
    ],
    link: payment?.case_id
      ? adminLink(`/admin/cases/${payment.case_id}`)
      : adminLink("/admin")
  });
}
