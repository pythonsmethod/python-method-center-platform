import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { canSeeVoicePilotCosts, getFounderState } from "@/lib/auth/require-founder";
import { getPlatformCostOverview } from "@/lib/founder/costs";
import { getLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

export default async function PlatformCostsPage() {
  const [auth, locale] = await Promise.all([getFounderState(), getLocale()]);
  if (auth.status !== "authorized" || !canSeeVoicePilotCosts(auth.email)) notFound();
  const overview = await getPlatformCostOverview();
  const ru = locale === "ru";
  const money = (value: number) => new Intl.NumberFormat(ru ? "ru-RU" : "en-US", { style: "currency", currency: "USD", minimumFractionDigits: 3 }).format(value);
  const date = (value: string) => new Intl.DateTimeFormat(ru ? "ru-RU" : "en-US", { dateStyle: "short", timeStyle: "short", timeZone: "America/Los_Angeles" }).format(new Date(value));

  return <div className="page-shell page-shell--wide">
    <PageHeader
      eyebrow={ru ? "Кабинет разработчика · только Анна" : "Developer account · Anna only"}
      title={ru ? "Расходы платформы" : "Platform costs"}
      description={ru ? "Единая таблица внешних сервисов. Денежный итог включает только расходы, подтверждённые usage-данными; неизвестные счета не оцениваются." : "One table for external services. The monetary total includes only costs supported by usage data; unknown vendor bills are not estimated."}
    />

    {overview.status === "error" ? <p className="form-message form-message--error">{ru ? "Часть данных расходов сейчас недоступна. Неизвестные значения не включены в итог." : "Some cost data is currently unavailable. Unknown amounts are excluded from the total."}</p> : null}

    <section aria-label={ru ? "Известные расходы за 30 дней" : "Known costs for 30 days"} className="founder-metrics">
      <div className="founder-metric founder-metric--money"><b>{money(overview.knownCostUsd)}</b><span>{ru ? "подтверждённый минимум за 30 дней" : "verified minimum for 30 days"}</span></div>
      <div className="founder-metric"><b>{overview.voiceSessions.length}</b><span>{ru ? "голосовых сессий учтено" : "voice sessions metered"}</span></div>
      <div className="founder-metric"><b>{Math.round(overview.voiceSeconds / 60)}</b><span>{ru ? "минут GPT-Live" : "GPT-Live minutes"}</span></div>
    </section>

    <section className="panel" aria-labelledby="platform-cost-centers">
      <span className="panel__label">{ru ? "Охват" : "Coverage"}</span>
      <h2 id="platform-cost-centers">{ru ? "Что расходует платформа" : "What the platform spends on"}</h2>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>{ru ? "Сервис" : "Service"}</th><th>{ru ? "Использование" : "Usage"}</th><th>{ru ? "Расход за 30 дней" : "30-day cost"}</th><th>{ru ? "Основание" : "Basis"}</th></tr></thead>
        <tbody>{overview.rows.map(row => <tr key={row.service}>
          <td><strong>{row.service}</strong></td>
          <td>{row.usage[locale]}</td>
          <td>{row.costUsd === null ? (ru ? "Нет данных счёта" : "Billing data unavailable") : money(row.costUsd)}</td>
          <td>{ru ? ({ metered: "Usage API / аудит", activity: "Только число операций", vendor_bill: "Нужен счёт поставщика" } as const)[row.source] : ({ metered: "Usage API / audit", activity: "Activity count only", vendor_bill: "Vendor bill required" } as const)[row.source]}<br /><small>{row.note[locale]}</small></td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <section className="panel" aria-labelledby="voice-cost-sessions">
      <span className="panel__label">GPT-Live-1</span>
      <h2 id="voice-cost-sessions">{ru ? "Последние голосовые расходы" : "Recent voice costs"}</h2>
      {overview.voiceSessions.length === 0 ? <p className="empty-state">{ru ? "За последние 30 дней подтверждённых сессий нет." : "No metered sessions were found in the last 30 days."}</p> : <div className="table-wrap"><table className="data-table">
        <thead><tr><th>{ru ? "Дата" : "Date"}</th><th>{ru ? "Длительность" : "Duration"}</th><th>{ru ? "Стоимость" : "Cost"}</th><th>{ru ? "Статус" : "Status"}</th></tr></thead>
        <tbody>{overview.voiceSessions.map(session => <tr key={session.id}><td>{date(session.createdAt)}</td><td>{Math.round(session.seconds)} {ru ? "сек" : "sec"}</td><td>{money(session.estimatedUsd)}</td><td>{session.finalized ? (ru ? "Подтверждено API" : "API finalized") : (ru ? "Оценка" : "Estimate")}</td></tr>)}</tbody>
      </table></div>}
    </section>
  </div>;
}
