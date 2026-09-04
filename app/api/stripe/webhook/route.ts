import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { paymentProductLabel } from "@/lib/i18n/status-labels";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { describeFailedPayment, stripeDashboardUrl } from "@/lib/payments/failure";
import { openServicePeriod } from "@/lib/payments/service-period";
import {
  emailExactMatchPattern,
  getStripe,
  normalizePayerEmail,
  resolveStripeProduct
} from "@/lib/payments/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { awardReferralTokensForPayment } from "@/lib/tokens/award";
import { isUuid } from "@/lib/utils/uuid";
import { ensureDeliveryTaskForPayment } from "@/lib/delivery/create-task";
import { resolveAcceptedOfferVersion } from "@/lib/payments/offer-provenance";

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
          await handlePaidSession(supabase, session, event);
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed": {
        await handleFailedPayment(
          supabase,
          stripe,
          event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent,
          event
        );
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

// A failed payment leaves no trace in our database, so the alert is the only
// thing that exists about it. It has to carry everything a person needs to
// act: who tried, how much, why it failed, and one tap through to the
// payment in Stripe.
//
// The first version sent the event id and a link to /admin, where there is
// nothing about a failed payment at all. It fired during the focus group
// with no email on it, and there was no way to tell who had been unable to
// pay.
async function handleFailedPayment(
  supabase: ServiceClient,
  stripe: Stripe,
  object: Stripe.Checkout.Session | Stripe.PaymentIntent,
  event: Stripe.Event
) {
  const details = await describeFailedPayment(object, {
    livemode: event.livemode,
    lookup: {
      charge: (id) => stripe.charges.retrieve(id),
      customer: (id) => stripe.customers.retrieve(id)
    }
  });

  // If the address belongs to someone we know, point straight at their case
  // instead of at the top of the admin panel.
  const payerEmail = normalizePayerEmail(details.email);
  let caseId: string | null = null;
  let known = false;

  if (payerEmail) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", emailExactMatchPattern(payerEmail))
      .maybeSingle();

    known = Boolean(profile?.id);

    if (profile?.id) {
      const { data: caseRow } = await supabase
        .from("client_cases")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle();

      caseId = caseRow?.id ?? null;
    }
  }

  const amount =
    details.amountCents !== null
      ? `${(details.amountCents / 100).toFixed(2)} ${(details.currency ?? "usd").toUpperCase()}`
      : null;

  await notifyTeam({
    kind: "payment",
    dedupeKey: `payment_failed:${event.id}`,
    title: "⚠️ Оплата не прошла",
    lines: [
      details.email
        ? `Плательщик: ${details.email}${known ? " — есть аккаунт" : " — аккаунта с таким email нет"}`
        : "Email плательщика Stripe не передал — смотрите платёж по ссылке ниже",
      amount ? `Сумма: ${amount}` : null,
      details.reason ? `Причина: ${details.reason}` : null,
      details.dashboardUrl ? `Платёж в Stripe: ${details.dashboardUrl}` : null,
      !event.livemode ? "Это тестовый режим Stripe, реальные деньги не списывались." : null,
      "Клиенту могла потребоваться помощь с оплатой."
    ],
    link: caseId ? adminLink(`/admin/cases/${caseId}`) : adminLink("/admin/cases")
  });
}

async function handlePaidSession(
  supabase: ServiceClient,
  session: Stripe.Checkout.Session,
  event: Stripe.Event
) {
  const eventId = event.id;
  const amountCents = session.amount_total ?? 0;
  const currency = (session.currency ?? "usd").toUpperCase();
  const customerEmail = normalizePayerEmail(session.customer_details?.email);
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
    // P2-01: the pattern is fully escaped, so this is case-insensitive
    // EQUALITY — "%" and "_" in a payer-typed email can no longer match a
    // different client's address. No match → manual review, never a guess.
    const { data: byEmail } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", emailExactMatchPattern(customerEmail))
      .maybeSingle();

    profileId = byEmail?.id ?? null;
  }

  const product = resolveStripeProduct({
    metadata: session.metadata,
    amountCents,
    currency: session.currency
  });

  // 2) Unmatched client or unknown amount → loud manual-review alert. Never
  // guess who paid.
  if (!profileId || !product) {
    await supabase.from("payment_reconciliation_items").upsert({
      stripe_event_id: eventId,
      stripe_session_id: session.id,
      processor_reference: reference,
      event_type: event.type,
      livemode: event.livemode,
      amount_cents: amountCents,
      currency,
      candidate_product: product,
      candidate_profile_id: profileId,
      status: !profileId
        ? "REQUIRES_OWNER_IDENTIFICATION"
        : "INVALID_OR_UNSUPPORTED_PRODUCT",
      reason: !profileId
        ? "Stripe payment has no uniquely resolved platform profile; no offer acceptance can be attributed."
        : "Stripe payment product is not uniquely supported; offer provenance cannot be resolved.",
      next_action: "Authorized staff must inspect the existing Stripe merchant evidence; do not infer identity, product, or offer version.",
      audit_metadata: { source: "stripe_webhook" }
    }, { onConflict: "stripe_event_id", ignoreDuplicates: true });

    // The money is in and we do not know whose it is. Everything needed to
    // find out goes in the alert: what was bought, the address that failed
    // to match, why it probably failed, and one tap through to the payment
    // in Stripe — which is where the payer's name and card country are.
    await notifyTeam({
      kind: "payment",
      dedupeKey: `payment_unmatched:${eventId}`,
      title: "💰 ОПЛАТА ПОЛУЧЕНА — нужна ручная привязка",
      lines: [
        product ? `Тариф: ${paymentProductLabel(product)}` : null,
        `Сумма: ${(amountCents / 100).toFixed(2)} ${currency}`,
        customerEmail
          ? `Email плательщика: ${customerEmail} (аккаунт ${profileId ? "найден" : "не найден"})`
          : "Email плательщика не передан",
        !product ? "Сумма не совпала ни с одним тарифом" : null,
        !profileId && customerEmail
          ? "Обычно это значит, что человек платил, не войдя в аккаунт, или с другого адреса — спросите, каким email он регистрировался."
          : null,
        stripeDashboardUrl(reference, event.livemode)
          ? `Платёж в Stripe: ${stripeDashboardUrl(reference, event.livemode)}`
          : `Референс: ${reference}`,
        !event.livemode
          ? "Это тестовый режим Stripe, реальные деньги не списывались."
          : null,
        "Свяжитесь с разработчиком: ручная запись оплаты отключена."
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
  const paidAt = new Date(event.created * 1000);
  const offerProvenance = await resolveAcceptedOfferVersion(
    supabase,
    profileId,
    product,
    paidAt
  );
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      profile_id: profileId,
      case_id: caseRow?.id ?? null,
      product,
      status: "paid",
      amount_cents: amountCents,
      currency,
      offer_version: offerProvenance?.version ?? null,
      processor_reference: reference,
      paid_at: paidAt.toISOString(),
      metadata: {
        source: "stripe_webhook",
        stripe_event_id: eventId,
        stripe_session_id: session.id,
        customer_email: customerEmail,
        stripe_metadata: session.metadata,
        offer_acceptance: offerProvenance
          ? {
              consent_record_id: offerProvenance.consentRecordId,
              accepted_at: offerProvenance.acceptedAt
            }
          : null
      }
    })
    .select("id")
    .single();

  if (paymentError) {
    if (paymentError.code === "23505") {
      // Reference already recorded by an earlier webhook delivery.
      return;
    }

    // Money left the client's card and the platform could not record it.
    // Silence here is the worst outcome: the client sees an empty cabinet
    // and no one knows. Tell the team the exact reason, then fail so
    // Stripe retries the delivery.
    await notifyTeam({
      kind: "processing_error",
      dedupeKey: `payment-insert-failed:${eventId}`,
      title: "ОШИБКА: ОПЛАТА ПОЛУЧЕНА, НО НЕ ЗАПИСАНА",
      lines: [
        `Сумма: ${(amountCents / 100).toFixed(2)} ${currency}`,
        customerEmail ? `Плательщик: ${customerEmail}` : null,
        `Тариф: ${paymentProductLabel(product)}`,
        `Ошибка базы: ${paymentError.message}`,
        `Референс: ${reference}`,
        "Клиент оплатил, но запись не создана — нужна техническая проверка."
      ],
      link: adminLink("/admin/cases")
    });

    throw new Error(`payment insert failed: ${paymentError.message}`);
  }

  if (!offerProvenance) {
    await supabase.from("payment_reconciliation_items").upsert(
      {
        stripe_event_id: eventId,
        stripe_session_id: session.id,
        processor_reference: reference,
        event_type: event.type,
        livemode: event.livemode,
        amount_cents: amountCents,
        currency,
        candidate_product: product,
        candidate_profile_id: profileId,
        candidate_case_id: caseRow?.id ?? null,
        status: "OTHER_BLOCKED_WITH_EXACT_REASON",
        reason: "Payment recorded without a uniquely proven offer-acceptance consent for this product at or before settlement.",
        next_action: "Authorized staff must verify consent provenance; do not infer the current website offer version.",
        audit_metadata: { source: "stripe_webhook", payment_id: payment.id }
      },
      { onConflict: "stripe_event_id", ignoreDuplicates: true }
    );
  }

  // 4) Service period activation, tied to the payment. Shared with the
  // manual path on the case page, so a renewal follows the same rule
  // wherever the money came from.
  if (caseRow?.id) {
    const period = await openServicePeriod(supabase, {
      profileId,
      caseId: caseRow.id,
      paymentId: payment.id,
      product,
      paidAt
    });

    if (period.status === "failed") {
      await notifyTeam({
        kind: "processing_error",
        dedupeKey: `service-period-failed:${eventId}`,
        title: "ОШИБКА ОБРАБОТКИ: период сопровождения не создан",
        lines: [
          `Оплата ${payment.id} записана, но период сопровождения не активирован.`,
          `Ошибка: ${period.message}`,
          "Создайте период вручную."
        ],
        link: adminLink(`/admin/cases/${caseRow.id}`)
      });
    }
  }

  // 5) Create the delivery task when the address and a country volunteer
  // are ready. Missing prerequisites remain visible instead of inventing data.
  const delivery = await ensureDeliveryTaskForPayment(supabase, {
    paymentId: payment.id,
    profileId,
    caseId: caseRow?.id ?? null,
    product
  });
  if (!["ready", "not-applicable"].includes(delivery.status)) {
    await notifyTeam({
      kind: "processing_error",
      dedupeKey: `delivery-not-created:${payment.id}`,
      title: "📦 Оплата получена, задание доставки ожидает",
      lines: [delivery.status === "address-required" ? "Клиент должен заполнить полный адрес." : "Для страны не назначен волонтёр."],
      link: caseRow?.id ? adminLink(`/admin/cases/${caseRow.id}`) : adminLink("/admin/fulfillment")
    });
  }

  // 6) Referral reward: if this client was invited by someone, the referrer
  // earns tokens (once per invited person).
  await awardReferralTokensForPayment({
    payerProfileId: profileId,
    paymentId: payment.id,
    amountCents
  });

  // 7) Team ping about the money.
  await notifyTeam({
    kind: "payment",
    dedupeKey: `payment_recorded:${payment.id}`,
    title: "💰 Оплата получена и записана автоматически",
    lines: [
      `Тариф: ${paymentProductLabel(product)}`,
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
