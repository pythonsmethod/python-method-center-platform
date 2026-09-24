import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { paymentProductLabel } from "@/lib/i18n/status-labels";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import { describeFailedPayment, stripeDashboardUrl } from "@/lib/payments/failure";
import { openServicePeriod } from "@/lib/payments/service-period";
import {
  emailExactMatchPattern,
  expectedPersonalSupportAmountCents,
  getStripe,
  isValidPersonalSupportCharge,
  normalizePayerEmail,
  personalSupportMonthsFromMetadata,
  resolveStripeProduct,
  supportMonthsFromMetadata
} from "@/lib/payments/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { awardReferralTokensForPayment } from "@/lib/tokens/award";
import { isUuid } from "@/lib/utils/uuid";
import { ensureDeliveryTaskForPayment } from "@/lib/delivery/create-task";
import { ensureCheckoutPrice } from "@/lib/payments/checkout-catalog";
import { ensureThirtyDayRenewalSchedule } from "@/lib/payments/renewal-schedule";
import { paidSubscriptionInvoicePeriod } from "@/lib/payments/stripe-invoice-period";

export const runtime = "nodejs";

// Stripe webhook: the only trusted source of payment truth. Browser
// redirects are never treated as proof of payment.
//
// Handled events:
// - checkout.session.completed / checkout.session.async_payment_succeeded →
//   automatic payment record + active service period;
// - checkout.session.async_payment_failed / payment_intent.payment_failed →
//   team alert;
// - invoice.paid → recurring Personal Support payment + another 30-day period;
 // - invoice.payment_failed → team alert without extending access;
 // - customer.subscription.updated/deleted → subscription state sync;
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
          await handlePaidSession(supabase, stripe, session, event);
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
      case "invoice.paid": {
        await handlePaidSubscriptionInvoice(
          supabase,
          event.data.object as Stripe.Invoice,
          event
        );
        break;
      }
      case "invoice.payment_failed": {
        await handleFailedSubscriptionInvoice(
          supabase,
          event.data.object as Stripe.Invoice,
          event
        );
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionState(
          supabase,
          event.data.object as Stripe.Subscription
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

    // Release the idempotency claim so Stripe can retry. Downstream writes are
    // independently idempotent by processor_reference/payment_id.
    await supabase.from("stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "processing-failed" }, { status: 500 });
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
  stripe: Stripe,
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
  const purchasedMonths =
    product === "personal_support"
      ? supportMonthsFromMetadata(session.metadata, amountCents, session.currency)
      : 1;
  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  const initialInvoiceId = typeof session.invoice === "string"
    ? session.invoice : session.invoice?.id ?? null;
  const stripePeriod = product === "personal_support" && stripeSubscriptionId
    ? initialInvoiceId
      ? paidSubscriptionInvoicePeriod(
          await stripe.invoices.retrieve(initialInvoiceId), stripeSubscriptionId, purchasedMonths
        )
      : null
    : null;
  if (stripeSubscriptionId && !stripePeriod) {
    throw new Error("paid subscription invoice missing from checkout");
  }

  if (product === "personal_support") {
    const metadataMonths = personalSupportMonthsFromMetadata(session.metadata);
    const baseAmountCents = session.amount_subtotal ?? session.amount_total;
    if (
      metadataMonths === null ||
      !isValidPersonalSupportCharge({
        amountCents: baseAmountCents,
        currency: session.currency,
        months: metadataMonths
      }) ||
      !isValidPersonalSupportCharge({
        amountCents,
        currency: session.currency,
        months: metadataMonths
      })
    ) {
      await notifyTeam({
        kind: "processing_error",
        dedupeKey: `personal-support-contract-mismatch:${eventId}`,
        title: "ОШИБКА: Stripe Personal Support не совпадает с договором",
        lines: [
          `Событие: ${eventId}`,
          `Metadata product: ${session.metadata?.product ?? "не задано"}`,
          `Metadata months: ${session.metadata?.months ?? "не задано"}`,
          `Базовая сумма: ${baseAmountCents ?? 0}; списано: ${amountCents} ${(session.currency ?? "не задано").toUpperCase()}`,
          "Доступ не выдан: проверьте тестовую Payment Link и metadata."
        ],
        link: adminLink("/admin")
      });
      return;
    }
  }

  // 2) Unmatched client or unknown amount → loud manual-review alert. Never
  // guess who paid.
  if (!profileId || !product) {
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
  const paidAt = new Date();
  const { data: insertedPayment, error: paymentError } = await supabase
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
        customer_email: customerEmail,
        stripe_metadata: session.metadata
      }
    })
    .select("id")
    .single();
  let payment = insertedPayment;

  if (paymentError) {
    if (paymentError.code === "23505") {
      const { data: existingPayment, error: existingPaymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("processor_reference", reference)
        .maybeSingle();
      if (existingPaymentError || !existingPayment?.id) {
        throw new Error("duplicate payment could not be resumed");
      }
      payment = existingPayment;
    } else {
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
  }

  if (!payment) throw new Error("payment record missing after insert");

  // 4) Service period activation, tied to the payment. Shared with the
  // manual path on the case page, so a renewal follows the same rule
  // wherever the money came from.
  if (caseRow?.id) {
    const period = await openServicePeriod(supabase, {
      profileId,
      caseId: caseRow.id,
      paymentId: payment.id,
      product,
      paidAt,
      months: purchasedMonths,
      ...(stripePeriod ? { stripePeriod } : {})
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
      throw new Error(`service period failed: ${period.message}`);
    }
  }

  // 5) Create the delivery task when the address and a country volunteer
  // are ready. Missing prerequisites remain visible instead of inventing data.
  const delivery = await ensureDeliveryTaskForPayment(supabase, {
    paymentId: payment.id,
    profileId,
    caseId: caseRow?.id ?? null,
    product,
    months: purchasedMonths
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

  // 6) A subscription-mode Payment Link means the client enabled automatic
  // renewal. The initial prepaid term was charged above; later invoice.paid
  // events extend access by exactly one 30-day period. No card data is stored.
  if (product === "personal_support" && stripeSubscriptionId) {
    const stripeCustomerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    const locale = session.metadata?.ui_locale === "en" ? "en" : "ru";
    const renewalPriceId = await ensureCheckoutPrice(stripe, "renewal", locale);
    await ensureThirtyDayRenewalSchedule(stripe, stripeSubscriptionId, renewalPriceId);
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const periodEnd = (stripeSubscription.items.data[0] as Stripe.SubscriptionItem & { current_period_end?: number })?.current_period_end;

    const { error: subscriptionError } = await supabase
      .from("billing_subscriptions")
      .upsert(
        {
          profile_id: profileId,
          case_id: caseRow?.id ?? null,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_customer_id: stripeCustomerId,
          status: "active",
          initial_months: purchasedMonths,
          renewal_days: 30,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null
        },
        { onConflict: "stripe_subscription_id" }
      );

    if (subscriptionError) {
      await notifyTeam({
        kind: "processing_error",
        dedupeKey: `subscription-link-failed:${eventId}`,
        title: "ОШИБКА: автопродление оплачено, но подписка не привязана",
        lines: [
          `Subscription: ${stripeSubscriptionId}`,
          `Ошибка базы: ${subscriptionError.message}`,
          "Первоначальный оплаченный срок сохранён, но до исправления будущие автоплатежи не смогут автоматически продлевать кейс."
        ],
        link: caseRow?.id
          ? adminLink(`/admin/cases/${caseRow.id}`)
          : adminLink("/admin/cases")
      });
      throw new Error(`subscription link failed: ${subscriptionError.message}`);
    }
  }

  // 7) Referral reward: if this client was invited by someone, the referrer
  // earns tokens (once per invited person).
  await awardReferralTokensForPayment({
    payerProfileId: profileId,
    paymentId: payment.id,
    amountCents
  });

  // 8) Team ping about the money.
  await notifyTeam({
    kind: "payment",
    dedupeKey: `payment_recorded:${payment.id}`,
    title: "💰 Оплата получена и записана автоматически",
    lines: [
      `Тариф: ${paymentProductLabel(product)}`,
      `Сумма: ${(amountCents / 100).toFixed(2)} ${currency}`,
      product === "personal_support" ? `Оплаченный срок: ${purchasedMonths} мес. (${purchasedMonths * 30} дней)` : null,
      stripeSubscriptionId ? "Автопродление: включено" : product === "personal_support" ? "Автопродление: выключено" : null,
      customerEmail ? `Клиент: ${customerEmail}` : null,
      caseRow?.id
        ? `Кейс: ${caseRow.id} — период сопровождения активирован`
        : "Кейс ещё не создан (клиент не заполнил анкету) — оплата привязана к профилю"
    ],
    link: caseRow?.id ? adminLink(`/admin/cases/${caseRow.id}`) : adminLink("/admin/cases")
  });
}

type InvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string | Stripe.Subscription | null;
  payment_intent?: string | Stripe.PaymentIntent | null;
  parent?: {
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
    } | null;
  } | null;
};

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const shaped = invoice as InvoiceWithSubscription;
  const direct = shaped.subscription;
  if (typeof direct === "string") return direct;
  if (direct?.id) return direct.id;

  const nested = shaped.parent?.subscription_details?.subscription;
  if (typeof nested === "string") return nested;
  return nested?.id ?? null;
}

function invoicePaymentReference(invoice: Stripe.Invoice): string {
  const shaped = invoice as InvoiceWithSubscription;
  const intent = shaped.payment_intent;
  if (typeof intent === "string") return intent;
  return intent?.id ?? invoice.id;
}

async function handlePaidSubscriptionInvoice(
  supabase: ServiceClient,
  invoice: Stripe.Invoice,
  event: Stripe.Event
) {
  // The prepaid checkout itself can also emit an invoice for subscription
  // creation. Its service period is already opened by checkout.session.completed.
  if (invoice.billing_reason === "subscription_create") {
    return;
  }

  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const { data: subscription } = await supabase
    .from("billing_subscriptions")
    .select("id, profile_id, case_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (!subscription?.profile_id) {
    await notifyTeam({
      kind: "payment",
      dedupeKey: `subscription_invoice_unmatched:${event.id}`,
      title: "💰 АВТОПЛАТЁЖ ПОЛУЧЕН — подписка не привязана",
      lines: [
        `Invoice: ${invoice.id}`,
        `Subscription: ${subscriptionId}`,
        "Не удалось найти владельца подписки в billing_subscriptions."
      ],
      link: adminLink("/admin/cases")
    });
    return;
  }

  const amountCents = invoice.amount_paid ?? 0;
  const baseAmountCents = invoice.subtotal ?? 0;
  const currency = (invoice.currency ?? "usd").toUpperCase();
  const paidAt = new Date();
  const reference = invoicePaymentReference(invoice);
  const stripePeriod = paidSubscriptionInvoicePeriod(invoice, subscriptionId, 1);

  if (
    !isValidPersonalSupportCharge({
      amountCents: baseAmountCents,
      currency: invoice.currency,
      months: 1
    }) ||
    !isValidPersonalSupportCharge({
      amountCents,
      currency: invoice.currency,
      months: 1
    })
  ) {
    await notifyTeam({
      kind: "processing_error",
      dedupeKey: `subscription-invoice-contract-mismatch:${event.id}`,
      title: "ОШИБКА: сумма автопродления Personal Support не совпадает",
      lines: [
        `Invoice: ${invoice.id}`,
        `Базовая сумма: ${baseAmountCents} ${currency}`,
        `Фактически оплачено: ${amountCents} ${currency}`,
        `Ожидалась базовая сумма: ${expectedPersonalSupportAmountCents()} USD`,
        "Новый период не открыт."
      ],
      link: adminLink("/admin/cases")
    });
    return;
  }

  const { data: insertedPayment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      profile_id: subscription.profile_id,
      case_id: subscription.case_id,
      product: "personal_support",
      status: "paid",
      amount_cents: amountCents,
      currency,
      processor_reference: reference,
      paid_at: paidAt.toISOString(),
      metadata: {
        source: "stripe_subscription_invoice",
        stripe_event_id: event.id,
        stripe_invoice_id: invoice.id,
        stripe_subscription_id: subscriptionId,
        support_months: 1,
        auto_renew: true
      }
    })
    .select("id")
    .single();
  let payment = insertedPayment;

  if (paymentError) {
    if (paymentError.code === "23505") {
      const { data: existingPayment, error: existingPaymentError } = await supabase
        .from("payments")
        .select("id")
        .eq("processor_reference", reference)
        .maybeSingle();
      if (existingPaymentError || !existingPayment?.id) {
        throw new Error("duplicate subscription payment could not be resumed");
      }
      payment = existingPayment;
    } else {
      throw new Error(`subscription payment insert failed: ${paymentError.message}`);
    }
  }

  if (!payment) throw new Error("subscription payment missing after insert");

  if (subscription.case_id) {
    const period = await openServicePeriod(supabase, {
      profileId: subscription.profile_id,
      caseId: subscription.case_id,
      paymentId: payment.id,
      product: "personal_support",
      paidAt,
      months: 1,
      stripePeriod
    });

    if (period.status === "failed") {
      await notifyTeam({
        kind: "processing_error",
        dedupeKey: `subscription-period-failed:${event.id}`,
        title: "ОШИБКА: автоплатёж записан, но сопровождение не продлено",
        lines: [`Оплата: ${payment.id}`, `Ошибка: ${period.message}`],
        link: adminLink(`/admin/cases/${subscription.case_id}`)
      });
      throw new Error(`subscription service period failed: ${period.message}`);
    }
  }

  const delivery = await ensureDeliveryTaskForPayment(supabase, {
    paymentId: payment.id,
    profileId: subscription.profile_id,
    caseId: subscription.case_id,
    product: "personal_support",
    months: 1
  });

  if (!["ready", "not-applicable"].includes(delivery.status)) {
    await notifyTeam({
      kind: "processing_error",
      dedupeKey: `subscription-delivery-pending:${payment.id}`,
      title: "📦 Автопродление оплачено, отправка подарка ожидает",
      lines: [
        delivery.status === "address-required"
          ? "Клиент должен заполнить полный адрес."
          : "Для страны не назначен волонтёр."
      ],
      link: subscription.case_id
        ? adminLink(`/admin/cases/${subscription.case_id}`)
        : adminLink("/admin/fulfillment")
    });
  }

  await supabase
    .from("billing_subscriptions")
    .update({
      status: "active",
      last_invoice_id: invoice.id,
      current_period_end: stripePeriod.endsAt.toISOString()
    })
    .eq("stripe_subscription_id", subscriptionId);

  await awardReferralTokensForPayment({
    payerProfileId: subscription.profile_id,
    paymentId: payment.id,
    amountCents
  });

  await notifyTeam({
    kind: "payment",
    dedupeKey: `subscription_payment_recorded:${payment.id}`,
    title: "💰 Автопродление сопровождения оплачено",
    lines: [
      `Сумма: ${(amountCents / 100).toFixed(2)} ${currency}`,
      "Продление: +30 дней",
      `Subscription: ${subscriptionId}`
    ],
    link: subscription.case_id
      ? adminLink(`/admin/cases/${subscription.case_id}`)
      : adminLink("/admin/cases")
  });
}

async function handleFailedSubscriptionInvoice(
  supabase: ServiceClient,
  invoice: Stripe.Invoice,
  event: Stripe.Event
) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  await supabase
    .from("billing_subscriptions")
    .update({ status: "past_due", last_invoice_id: invoice.id })
    .eq("stripe_subscription_id", subscriptionId);

  await notifyTeam({
    kind: "payment",
    dedupeKey: `subscription_payment_failed:${event.id}`,
    title: "⚠️ Автопродление не оплачено",
    lines: [
      `Invoice: ${invoice.id}`,
      `Subscription: ${subscriptionId}`,
      "Новый 30-дневный период не открыт и подарок к нему не отправляется."
    ],
    link: adminLink("/admin/cases")
  });
}

async function syncSubscriptionState(
  supabase: ServiceClient,
  subscription: Stripe.Subscription
) {
  const status =
    subscription.status === "canceled"
      ? "cancelled"
      : subscription.status === "trialing" ||
          subscription.status === "active" ||
          subscription.status === "past_due" ||
          subscription.status === "paused" ||
          subscription.status === "unpaid" ||
          subscription.status === "incomplete"
        ? subscription.status
        : "active";

  await supabase
    .from("billing_subscriptions")
    .update({ status })
    .eq("stripe_subscription_id", subscription.id);
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
