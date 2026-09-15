import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type PlatformCostRow = {
  service: string;
  usage: { ru: string; en: string };
  costUsd: number | null;
  source: "metered" | "activity" | "vendor_bill";
  note: { ru: string; en: string };
};

export type VoiceCostSession = {
  id: string;
  createdAt: string;
  seconds: number;
  estimatedUsd: number;
  finalized: boolean;
};

export type PlatformCostOverview = {
  status: "ready" | "error";
  message?: string;
  knownCostUsd: number;
  voiceSeconds: number;
  rows: PlatformCostRow[];
  voiceSessions: VoiceCostSession[];
};

type LiveAuditRow = { id: string; created_at: string; metadata: unknown };

function finiteNonNegative(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function summarizeLiveCosts(rows: LiveAuditRow[]): VoiceCostSession[] {
  return rows.flatMap(row => {
    if (!row.metadata || typeof row.metadata !== "object") return [];
    const metadata = row.metadata as Record<string, unknown>;
    const seconds = finiteNonNegative(metadata.seconds);
    const estimatedUsd = finiteNonNegative(metadata.estimatedUsd);
    if (seconds === null || estimatedUsd === null) return [];
    return [{ id: row.id, createdAt: row.created_at, seconds, estimatedUsd, finalized: metadata.finalized === true }];
  });
}

// Read-only founder accounting. Unknown vendor invoices remain explicitly
// unknown: activity counters must never be presented as money.
export async function getPlatformCostOverview(): Promise<PlatformCostOverview> {
  const db = createSupabaseServiceClient();
  if (!db) return { status: "error", message: "Supabase service access is unavailable.", knownCostUsd: 0, voiceSeconds: 0, rows: [], voiceSessions: [] };

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [live, searches, documents] = await Promise.all([
    db.from("audit_logs").select("id, created_at, metadata").eq("action", "assistant.live.ended").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
    db.from("audit_logs").select("id", { count: "exact", head: true }).eq("action", "assistant.web.search").gte("created_at", since),
    db.from("document_processing_jobs").select("id", { count: "exact", head: true }).eq("status", "ready").gte("updated_at", since),
  ]);

  const voiceSessions = summarizeLiveCosts((live.data ?? []) as LiveAuditRow[]);
  const knownCostUsd = voiceSessions.reduce((sum, row) => sum + row.estimatedUsd, 0);
  const voiceSeconds = voiceSessions.reduce((sum, row) => sum + row.seconds, 0);
  const rows: PlatformCostRow[] = [
    { service: "OpenAI GPT-Live-1", usage: { ru: `${Math.round(voiceSeconds)} сек / 30 дней`, en: `${Math.round(voiceSeconds)} sec / 30 days` }, costUsd: knownCostUsd, source: "metered", note: { ru: "Usage сессии передаётся Live API и хранится в серверном аудите.", en: "Session usage is reported by Live and stored in the server audit." } },
    { service: "OpenAI text / reasoning", usage: { ru: "Активный поставщик", en: "Active provider" }, costUsd: null, source: "vendor_bill", note: { ru: "Токены пока не сохраняются; точная сумма берётся из счёта OpenAI.", en: "Token usage is not yet persisted; use the OpenAI invoice for the exact amount." } },
    { service: "Anthropic Claude", usage: { ru: "Активный поставщик", en: "Active provider" }, costUsd: null, source: "vendor_bill", note: { ru: "Токены и cache usage пока не сохраняются; точная сумма берётся из счёта Anthropic.", en: "Token and cache usage are not yet persisted; use the Anthropic invoice." } },
    { service: "OpenAI web search", usage: { ru: `${searches.count ?? 0} поисков / 30 дней`, en: `${searches.count ?? 0} searches / 30 days` }, costUsd: null, source: "activity", note: { ru: "Число поисков учтено; детализация счёта поставщика не подключена.", en: "Search activity is counted; provider billing detail is not connected." } },
    { service: "Google Document AI", usage: { ru: `${documents.count ?? 0} документов завершено / 30 дней`, en: `${documents.count ?? 0} documents completed / 30 days` }, costUsd: null, source: "activity", note: { ru: "Завершённые задания учтены; постраничный счёт поставщика не подключён.", en: "Completed jobs are counted; page-level provider billing is not connected." } },
    { service: "Vercel hosting", usage: { ru: "Аккаунт поставщика", en: "Vendor account" }, costUsd: null, source: "vendor_bill", note: { ru: "Выгрузка биллинга Vercel не подключена.", en: "The Vercel billing feed is not connected." } },
    { service: "Supabase database and storage", usage: { ru: "Аккаунт поставщика", en: "Vendor account" }, costUsd: null, source: "vendor_bill", note: { ru: "Выгрузка биллинга Supabase не подключена.", en: "The Supabase billing feed is not connected." } },
    { service: "Stripe processing fees", usage: { ru: "Аккаунт поставщика", en: "Vendor account" }, costUsd: null, source: "vendor_bill", note: { ru: "Комиссии требуют Stripe balance transactions; выручка не считается расходом.", en: "Fees require Stripe balance transactions; revenue is not a platform expense." } },
  ];

  return {
    status: live.error || searches.error || documents.error ? "error" : "ready",
    ...(live.error || searches.error || documents.error ? { message: "Some activity sources could not be loaded." } : {}),
    knownCostUsd,
    voiceSeconds,
    rows,
    voiceSessions,
  };
}
