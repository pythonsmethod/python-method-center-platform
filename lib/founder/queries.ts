import {
  getGuestDailyTotalLimit,
  getPublicAssistantMode
} from "@/lib/assistant/guard";
import { hasAssistantEnv } from "@/lib/assistant/router";
import {
  isFreeReviewActive
} from "@/lib/config/promo";
import {
  actorRoleLabels,
  auditActionLabels,
  caseStatusLabels,
  formatMoney,
  lifecycleLabels,
  notificationKindLabels,
  notificationStatusLabels,
  productLabels
} from "@/lib/founder/labels";
import { isTelegramConfigured } from "@/lib/notifications/telegram";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type FounderMetrics = {
  clients: number;
  cases: number;
  activeSupport: number;
  newClients7d: number;
  paidPayments30d: number;
  revenue30dCents: number;
  revenueTotalCents: number;
  openEscalations: number;
  openRequests: number;
  documents: number;
  messages7d: number;
};

export type TimelineKind =
  | "escalation"
  | "payment"
  | "message"
  | "request"
  | "case"
  | "audit"
  | "notification";

export type FounderTimelineItem = {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  detail: string | null;
  href: string | null;
};

export type SystemStatusItem = {
  name: string;
  ok: boolean;
  detail: string;
};

export type FounderOverview = {
  status: "ready" | "error";
  message?: string;
  metrics: FounderMetrics;
  timeline: FounderTimelineItem[];
  systems: SystemStatusItem[];
  notificationHealth: { sent: number; failed: number; skipped: number };
};

const emptyMetrics: FounderMetrics = {
  clients: 0,
  cases: 0,
  activeSupport: 0,
  newClients7d: 0,
  paidPayments30d: 0,
  revenue30dCents: 0,
  revenueTotalCents: 0,
  openEscalations: 0,
  openRequests: 0,
  documents: 0,
  messages7d: 0
};

const TIMELINE_PER_SOURCE = 25;
const TIMELINE_TOTAL = 60;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

type ServiceClient = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

type CountFilter =
  | { type: "eq"; column: string; value: string }
  | { type: "gte"; column: string; value: string };

async function countRows(
  supabase: ServiceClient,
  table: string,
  filter?: CountFilter
): Promise<number> {
  const base = supabase.from(table).select("id", { count: "exact", head: true });
  const query = filter
    ? filter.type === "eq"
      ? base.eq(filter.column, filter.value)
      : base.gte(filter.column, filter.value)
    : base;

  const { count } = await query;
  return count ?? 0;
}

// Everything the founder needs to see what is happening on the platform:
// aggregate numbers, one merged event timeline, and live system status.
// Read-only — this view never writes.
export async function getFounderOverview(): Promise<FounderOverview> {
  const supabase = createSupabaseServiceClient();

  const systems: SystemStatusItem[] = [
    {
      name: "База данных (Supabase)",
      ok: Boolean(supabase),
      detail: supabase
        ? "Подключена, служебный ключ настроен"
        : "Служебный ключ не настроен — данные недоступны"
    },
    {
      name: "ИИ-помощники (Claude / GPT)",
      ok: hasAssistantEnv(),
      detail: hasAssistantEnv()
        ? "Ключи заданы, ассистенты отвечают"
        : "Нет ключей ANTHROPIC_API_KEY / OPENAI_API_KEY"
    },
    {
      name: "Уведомления в Telegram",
      ok: isTelegramConfigured(),
      detail: isTelegramConfigured()
        ? "Бот настроен — сигналы приходят в чат команды"
        : "Не настроены TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID"
    },
    {
      // A reminder that does not depend on anyone remembering. The paid
      // review is not described in the offer at all — the contract lists the
      // free assessment, 5 weeks and 100 days, and nothing else. While the
      // review is free this is harmless; the moment it is switched to paid,
      // the center would be selling something its contract does not mention.
      name: "Услуга «Разбор анализов» в договоре",
      ok: isFreeReviewActive(),
      detail: isFreeReviewActive()
        ? "Разбор сейчас бесплатный — договор описывать его не обязан"
        : "ВКЛЮЧЁН ПЛАТНЫЙ РЕЖИМ, а услуги «Разбор анализов» нет в оферте. Внесите её в договор (lib/legal/offer-content.ts) и поднимите версию, прежде чем принимать оплату."
    },
    {
      name: "Автозапись оплат (Stripe webhook)",
      ok: Boolean(
        process.env.STRIPE_SECRET_KEY?.trim() &&
          process.env.STRIPE_WEBHOOK_SECRET?.trim()
      ),
      detail:
        process.env.STRIPE_SECRET_KEY?.trim() &&
        process.env.STRIPE_WEBHOOK_SECRET?.trim()
          ? "Оплаты записываются автоматически"
          : "Нет STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET — оплаты вносятся вручную"
    },
    {
      name: "Кнопки оплаты на сайте",
      ok: Boolean(
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W?.trim() &&
          process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W?.trim()
      ),
      detail:
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_5W?.trim() &&
        process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_15W?.trim()
          ? "Обе ссылки на тарифы активны"
          : "Заданы не все ссылки на тарифы"
    },
    {
      name: "Акция «Бесплатный разбор»",
      ok: true,
      detail: isFreeReviewActive()
        ? "Включена — разбор анализов бесплатный"
        : "Выключена — акция завершена"
    }
  ];

  if (!supabase) {
    return {
      status: "error",
      message:
        "Служебный ключ Supabase не настроен — сводка и история недоступны.",
      metrics: emptyMetrics,
      timeline: [],
      systems,
      notificationHealth: { sent: 0, failed: 0, skipped: 0 }
    };
  }

  // Keys being set is not the same as events arriving. A webhook can be
  // configured perfectly and still point at a different address entirely —
  // which is exactly how a real payment can go missing. So the panel says
  // whether anything has actually reached us.
  const { data: lastStripeEvent } = await supabase
    .from("stripe_events")
    .select("type, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  systems.splice(
    systems.findIndex((item) => item.name.startsWith("Автозапись оплат")) + 1,
    0,
    {
      name: "События от Stripe доходят",
      ok: Boolean(lastStripeEvent),
      detail: lastStripeEvent
        ? `Последнее: ${lastStripeEvent.type} — ${new Date(
            lastStripeEvent.created_at
          ).toLocaleString("ru-RU")}`
        : "Ни одного события не получено. В Stripe адрес вебхука должен быть https://pythonmethodcenter.com/api/stripe/webhook"
    }
  );

  const since7d = daysAgo(7);
  const since30d = daysAgo(30);

  const [
    clients,
    cases,
    activeSupport,
    newClients7d,
    documents,
    openEscalations,
    openRequests,
    messages7d,
    paymentsAll,
    escalationRows,
    paymentRows,
    messageRows,
    requestRows,
    lifecycleRows,
    auditRows,
    notificationRows
  ] = await Promise.all([
    countRows(supabase, "profiles", { type: "eq", column: "role", value: "client" }),
    countRows(supabase, "client_cases"),
    countRows(supabase, "client_cases", {
      type: "eq",
      column: "status",
      value: "active_support"
    }),
    countRows(supabase, "profiles", {
      type: "gte",
      column: "created_at",
      value: since7d
    }),
    countRows(supabase, "uploaded_documents"),
    countRows(supabase, "escalation_events", {
      type: "eq",
      column: "status",
      value: "open"
    }),
    countRows(supabase, "support_requests", {
      type: "eq",
      column: "status",
      value: "open"
    }),
    countRows(supabase, "case_messages", {
      type: "gte",
      column: "created_at",
      value: since7d
    }),
    supabase
      .from("payments")
      .select("id, amount_cents, currency, product, status, paid_at, created_at, case_id")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("escalation_events")
      .select("id, category, routing_target, status, created_at, case_id, profile_id")
      .order("created_at", { ascending: false })
      .limit(TIMELINE_PER_SOURCE),
    supabase
      .from("payments")
      .select("id, amount_cents, currency, product, status, created_at, case_id")
      .order("created_at", { ascending: false })
      .limit(TIMELINE_PER_SOURCE),
    supabase
      .from("case_messages")
      .select("id, sender_role, created_at, case_id, audio_path")
      .order("created_at", { ascending: false })
      .limit(TIMELINE_PER_SOURCE),
    supabase
      .from("support_requests")
      .select("id, subject, status, created_at, profile_id, contact_email")
      .order("created_at", { ascending: false })
      .limit(TIMELINE_PER_SOURCE),
    supabase
      .from("case_lifecycle_events")
      .select("id, event_type, from_status, to_status, actor_role, created_at, case_id")
      .order("created_at", { ascending: false })
      .limit(TIMELINE_PER_SOURCE),
    supabase
      .from("audit_logs")
      .select("id, action, actor_role, created_at, case_id")
      .order("created_at", { ascending: false })
      .limit(TIMELINE_PER_SOURCE),
    supabase
      .from("notification_events")
      .select("id, kind, status, created_at, last_error")
      .order("created_at", { ascending: false })
      .limit(TIMELINE_PER_SOURCE)
  ]);

  // How much of the free assistant level has been spent today: the founder
  // sees a raid as it happens, not on the invoice.
  const today = new Date().toISOString().slice(0, 10);
  const { data: usageRows } = await supabase
    .from("assistant_usage")
    .select("bucket_key, message_count")
    .eq("window_date", today);

  const guestMessagesToday =
    (usageRows ?? []).find((row) => row.bucket_key === "total:guest")
      ?.message_count ?? 0;
  const visitorsToday = (usageRows ?? []).filter((row) =>
    row.bucket_key.startsWith("v:")
  ).length;
  const guestLimit = getGuestDailyTotalLimit();
  const assistantMode = getPublicAssistantMode();

  systems.push({
    name: "Гостевой ИИ на сайте (сегодня)",
    ok: assistantMode === "open" && guestMessagesToday < guestLimit,
    detail:
      assistantMode === "off"
        ? "Помощник выключен для всех (PUBLIC_ASSISTANT_MODE=off)"
        : assistantMode === "registered_only"
          ? "Гостям закрыт: помощник отвечает только зарегистрированным"
          : `${guestMessagesToday} из ${guestLimit} бесплатных сообщений, посетителей: ${visitorsToday}${
              guestMessagesToday >= guestLimit
                ? " — дневной потолок исчерпан, гостям предлагается регистрация"
                : ""
            }`
  });

  const paidPayments = paymentsAll.data ?? [];
  const revenueTotalCents = paidPayments.reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );
  const recentPaid = paidPayments.filter(
    (row) => (row.paid_at ?? row.created_at) >= since30d
  );
  const revenue30dCents = recentPaid.reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );

  const timeline: FounderTimelineItem[] = [];

  for (const row of escalationRows.data ?? []) {
    timeline.push({
      id: `esc-${row.id}`,
      at: row.created_at,
      kind: "escalation",
      title:
        row.category === "physical_medical"
          ? "🔴 Красный флаг — физический/медицинский"
          : "🔴 Красный флаг — психологический кризис",
      detail: `Маршрут: ${row.routing_target === "karen" ? "Professor Python" : "поддержка"} · ${
        row.status === "open" ? "не обработан" : "обработан"
      }${row.profile_id ? "" : " · гость сайта"}`,
      href: row.case_id ? `/admin/cases/${row.case_id}` : "/admin"
    });
  }

  for (const row of paymentRows.data ?? []) {
    timeline.push({
      id: `pay-${row.id}`,
      at: row.created_at,
      kind: "payment",
      title: `💰 Оплата · ${formatMoney(row.amount_cents ?? 0, row.currency ?? "USD")}`,
      detail: `${productLabels[row.product] ?? row.product} · ${
        row.status === "paid"
          ? "оплачено"
          : row.status === "refunded"
            ? "возврат"
            : row.status
      }`,
      href: row.case_id ? `/admin/cases/${row.case_id}` : "/admin/cases"
    });
  }

  for (const row of messageRows.data ?? []) {
    const fromClient = row.sender_role === "client";
    timeline.push({
      id: `msg-${row.id}`,
      at: row.created_at,
      kind: "message",
      title: fromClient
        ? `✉️ Сообщение от клиента${row.audio_path ? " (голосовое)" : ""}`
        : `↩️ Ответ команды${row.audio_path ? " (голосовое)" : ""}`,
      detail: fromClient ? "Ждёт ответа команды" : `Отправил: ${actorRoleLabels[row.sender_role] ?? row.sender_role}`,
      href: row.case_id ? `/admin/cases/${row.case_id}` : null
    });
  }

  for (const row of requestRows.data ?? []) {
    timeline.push({
      id: `req-${row.id}`,
      at: row.created_at,
      kind: "request",
      title: "📨 Обращение в поддержку",
      detail: `${row.subject}${row.profile_id ? "" : ` · гость: ${row.contact_email ?? "без контакта"}`}`,
      href: "/admin/requests"
    });
  }

  for (const row of lifecycleRows.data ?? []) {
    const transition =
      row.from_status || row.to_status
        ? ` · ${caseStatusLabels[row.from_status ?? ""] ?? "—"} → ${
            caseStatusLabels[row.to_status ?? ""] ?? "—"
          }`
        : "";

    timeline.push({
      id: `life-${row.id}`,
      at: row.created_at,
      kind: "case",
      title: `📁 ${lifecycleLabels[row.event_type] ?? row.event_type}`,
      detail: `Инициатор: ${actorRoleLabels[row.actor_role] ?? row.actor_role}${transition}`,
      href: row.case_id ? `/admin/cases/${row.case_id}` : null
    });
  }

  for (const row of auditRows.data ?? []) {
    timeline.push({
      id: `audit-${row.id}`,
      at: row.created_at,
      kind: "audit",
      title: `🗒 ${auditActionLabels[row.action] ?? row.action}`,
      detail: `Аудит · ${actorRoleLabels[row.actor_role] ?? row.actor_role}`,
      href: row.case_id ? `/admin/cases/${row.case_id}` : null
    });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of notificationRows.data ?? []) {
    if (row.status === "sent") sent += 1;
    if (row.status === "failed") failed += 1;
    if (row.status === "skipped") skipped += 1;

    // Only surface delivery problems in the timeline; successful sends are
    // already represented by their source events.
    if (row.status === "failed" || row.status === "skipped") {
      timeline.push({
        id: `notif-${row.id}`,
        at: row.created_at,
        kind: "notification",
        title: `⚠️ Уведомление не доставлено (${
          notificationKindLabels[row.kind] ?? row.kind
        })`,
        detail: `${notificationStatusLabels[row.status] ?? row.status}${
          row.last_error ? ` · ${String(row.last_error).slice(0, 120)}` : ""
        }`,
        href: null
      });
    }
  }

  timeline.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return {
    status: "ready",
    metrics: {
      clients,
      cases,
      activeSupport,
      newClients7d,
      paidPayments30d: recentPaid.length,
      revenue30dCents,
      revenueTotalCents,
      openEscalations,
      openRequests,
      documents,
      messages7d
    },
    timeline: timeline.slice(0, TIMELINE_TOTAL),
    systems,
    notificationHealth: { sent, failed, skipped }
  };
}
