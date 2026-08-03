import { buildDocumentTimeline } from "@/lib/documents/timeline";
import { caseStatusLabel } from "@/lib/i18n/status-labels";
import { caseStatusLabels } from "@/lib/founder/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Three levels of the client-facing assistant:
//   guest      — public site: only the center, the method, registration,
//                tariffs and the first step. Cheapest, narrowest.
//   registered — after sign-up: accompanies the person inside their cabinet,
//                aware of their own case status and what is missing.
//   client     — after payment: works with their case — documents, history,
//                the published recommendations of Professor Python.
export type AssistantTier = "guest" | "registered" | "client";

export type AssistantAudience = {
  tier: AssistantTier;
  profileId: string | null;
  email: string | null;
  // The person's case, when they already have one — saved conversations are
  // attached to it so the team sees them next to the rest of the case.
  caseId: string | null;
  // Human-readable snapshot of the person's own journey, injected into the
  // system prompt for registered and paying clients only.
  context: string | null;
};

const directionLabels: Record<string, string> = {
  recovery: "восстановление",
  rehabilitation: "реабилитация",
  preservation: "сохранение",
  not_set: "ещё не определено"
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

// Cheap tier check for the interface only: decides which greeting and which
// name the chat window shows. The answer itself is always built from the
// full resolver below, on the server.
export async function resolveAssistantTierForUi(): Promise<AssistantTier> {
  try {
    const auth = await createSupabaseServerClient();

    if (!auth) {
      return "guest";
    }

    const {
      data: { user }
    } = await auth.auth.getUser();

    if (!user) {
      return "guest";
    }

    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return "registered";
    }

    const { data } = await supabase
      .from("payments")
      .select("id")
      .eq("profile_id", user.id)
      .eq("status", "paid")
      .limit(1);

    return (data ?? []).length > 0 ? "client" : "registered";
  } catch {
    return "guest";
  }
}

// Resolves who is asking and builds their personal context in one pass.
// Never throws: on any failure the visitor is treated as a guest, which is
// the safest (narrowest) tier.
export async function resolveAssistantAudience(): Promise<AssistantAudience> {
  const guest: AssistantAudience = {
    tier: "guest",
    profileId: null,
    email: null,
    caseId: null,
    context: null
  };

  try {
    const auth = await createSupabaseServerClient();

    if (!auth) {
      return guest;
    }

    const {
      data: { user }
    } = await auth.auth.getUser();

    if (!user) {
      return guest;
    }

    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return {
        tier: "registered",
        profileId: user.id,
        email: user.email ?? null,
        caseId: null,
        context: null
      };
    }

    const [caseResult, paymentsResult] = await Promise.all([
      supabase
        .from("client_cases")
        .select("id, case_number, status, direction, created_at")
        .eq("profile_id", user.id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("product, status, paid_at")
        .eq("profile_id", user.id)
        .eq("status", "paid")
        .order("paid_at", { ascending: false })
    ]);

    const caseRow = caseResult.data;
    const paidPayments = paymentsResult.data ?? [];
    const hasPaid = paidPayments.length > 0;

    const lines: string[] = [];
    lines.push(`Собеседник вошёл в аккаунт: ${user.email ?? "email скрыт"}.`);

    if (!caseRow) {
      lines.push(
        "Анкета ещё НЕ заполнена — кейса нет. Самый важный следующий шаг для этого человека: заполнить анкету на /onboarding."
      );
    } else {
      lines.push(
        `Кейс создан ${formatDate(caseRow.created_at)}. Текущий статус: «${
          caseStatusLabels[caseRow.status] ?? caseStatusLabel(caseRow.status)
        }». Направление: ${directionLabels[caseRow.direction] ?? caseRow.direction}.`
      );
    }

    if (hasPaid) {
      const products = paidPayments
        .map((row) =>
          row.product === "support_5_weeks"
            ? "«5 недель»"
            : row.product === "support_15_weeks"
              ? "«100 дней»"
              : row.product
        )
        .join(", ");
      lines.push(`Оплачено сопровождение: ${products}. Это активный клиент центра.`);
    } else {
      lines.push("Сопровождение пока не оплачено.");
    }

    if (!caseRow) {
      return {
        tier: hasPaid ? "client" : "registered",
        profileId: user.id,
        email: user.email ?? null,
        caseId: null,
        context: lines.join("\n")
      };
    }

    const [documentsResult, eventsResult, periodResult] = await Promise.all([
      supabase
        .from("uploaded_documents")
        .select("id, original_filename, created_at")
        .eq("case_id", caseRow.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("case_lifecycle_events")
        .select("event_type, to_status, created_at")
        .eq("case_id", caseRow.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("service_periods")
        .select("product, status, starts_at, ends_at")
        .eq("case_id", caseRow.id)
        .order("starts_at", { ascending: false })
        .limit(1)
    ]);

    const documents = documentsResult.data ?? [];

    if (documents.length === 0) {
      lines.push(
        "Документы НЕ загружены. Без них Professor Python не сможет разобрать ситуацию — это следующий шаг."
      );
    } else {
      // Rounds and repeat versions matter to the conversation: "you sent
      // fresh blood work on the 15th" is a different sentence from "you
      // have 7 files".
      const rounds = buildDocumentTimeline(documents);
      const updates = rounds.reduce((sum, round) => sum + round.updateCount, 0);

      lines.push(
        `Загружено документов: ${documents.length} (загрузок по датам: ${rounds.length}${
          updates > 0
            ? `, из них повторных версий ранее присланных файлов: ${updates} — клиент присылает динамику`
            : ""
        }). Названия файлов: ${documents
          .map((row) => row.original_filename)
          .filter(Boolean)
          .slice(0, 10)
          .join("; ")}. Содержимое файлов из хранилища тебе НЕ доступно — только названия. Никогда не делай вид, что читал их.${
          hasPaid
            ? " Если клиент хочет показать сами анализы — предложи приложить фото или PDF скрепкой прямо в этот чат: приложенное ты читаешь полностью, выписываешь показатели и готовишь к разбору Professor Python. Свой разбор и выводы о состоянии НЕ даёшь — их даёт только Professor Python."
            : ""
        }`
      );
    }

    const period = periodResult.data?.[0];

    if (period) {
      lines.push(
        `Период сопровождения: ${
          period.product === "support_5_weeks" ? "5 недель" : "100 дней"
        }, статус «${period.status}», с ${formatDate(period.starts_at)} по ${formatDate(period.ends_at)}.`
      );
    }

    const events = eventsResult.data ?? [];

    if (events.length > 0) {
      lines.push(
        `История кейса (последние события): ${events
          .map((row) => `${formatDate(row.created_at)} — ${row.event_type}`)
          .join("; ")}.`
      );
    }

    return {
      tier: hasPaid ? "client" : "registered",
      profileId: user.id,
      email: user.email ?? null,
      caseId: caseRow.id,
      context: lines.join("\n")
    };
  } catch {
    return guest;
  }
}
