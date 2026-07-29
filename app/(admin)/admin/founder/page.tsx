import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorIsland } from "@/components/ErrorIsland";
import { TelegramSetupPanel } from "@/components/founder/TelegramSetupPanel";
import { PageHeader } from "@/components/PageHeader";
import { getFounderState } from "@/lib/auth/require-founder";
import { formatMoney, formatMoscowless } from "@/lib/founder/labels";
import { getFounderOverview } from "@/lib/founder/queries";
import { getReferralOverview } from "@/lib/referrals/queries";

export const dynamic = "force-dynamic";

// Founder cabinet: read-only observability over the whole platform —
// numbers, one merged event timeline, and live system status.
export default async function FounderPage() {
  const auth = await getFounderState();

  if (auth.status === "forbidden") {
    notFound();
  }

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell page-shell--wide">
        <PageHeader
          eyebrow="Кабинет основателя"
          title="Обзор платформы"
          description="Подключение к базе не настроено."
        />
        <p className="form-message form-message--error">
          Не заданы переменные окружения: {auth.missingEnvVars.join(", ")}.
        </p>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell page-shell--wide">
        <PageHeader
          eyebrow="Кабинет основателя"
          title="Обзор платформы"
          description="Не удалось проверить доступ."
        />
        <p className="form-message form-message--error">{auth.message}</p>
      </div>
    );
  }

  const [overview, referrals] = await Promise.all([
    getFounderOverview(),
    getReferralOverview()
  ]);
  const m = overview.metrics;

  return (
    <div className="page-shell page-shell--wide">
      <PageHeader
        eyebrow="Кабинет основателя"
        title="Обзор платформы"
        description="Всё, что происходит на платформе: цифры, живая лента событий и состояние систем. Этот раздел только показывает — здесь ничего нельзя изменить."
      />

      {overview.status === "error" ? (
        <p className="form-message form-message--error">{overview.message}</p>
      ) : null}

      <section aria-label="Ключевые цифры" className="founder-metrics">
        <div className="founder-metric">
          <b>{m.clients}</b>
          <span>клиентов зарегистрировано</span>
        </div>
        <div className="founder-metric">
          <b>{m.newClients7d}</b>
          <span>новых за 7 дней</span>
        </div>
        <div className="founder-metric">
          <b>{m.cases}</b>
          <span>кейсов всего</span>
        </div>
        <div className="founder-metric">
          <b>{m.activeSupport}</b>
          <span>в активном сопровождении</span>
        </div>
        <div className="founder-metric founder-metric--money">
          <b>{formatMoney(m.revenue30dCents)}</b>
          <span>оплат за 30 дней ({m.paidPayments30d} шт.)</span>
        </div>
        <div className="founder-metric founder-metric--money">
          <b>{formatMoney(m.revenueTotalCents)}</b>
          <span>всего оплачено на платформе</span>
        </div>
        <div
          className={`founder-metric${m.openEscalations > 0 ? " founder-metric--alert" : ""}`}
        >
          <b>{m.openEscalations}</b>
          <span>открытых красных флагов</span>
        </div>
        <div className="founder-metric">
          <b>{m.openRequests}</b>
          <span>открытых обращений</span>
        </div>
        <div className="founder-metric">
          <b>{m.messages7d}</b>
          <span>сообщений за 7 дней</span>
        </div>
        <div className="founder-metric">
          <b>{m.documents}</b>
          <span>документов загружено</span>
        </div>
      </section>

      <div className="founder-split">
        <section aria-label="Лента событий" className="panel">
          <span className="panel__label">История</span>
          <h2>Что происходит на платформе</h2>
          <p>
            Последние {overview.timeline.length} событий: красные флаги, оплаты,
            сообщения, обращения, изменения кейсов и записи аудита — в одной
            хронологии.
          </p>

          {overview.timeline.length === 0 ? (
            <p className="empty-state">
              Событий пока нет. Здесь появится всё, что делают клиенты и команда.
            </p>
          ) : (
            <ol className="founder-timeline">
              {overview.timeline.map((item) => (
                <li className={`founder-event founder-event--${item.kind}`} key={item.id}>
                  <span className="founder-event__time">
                    {formatMoscowless(item.at)}
                  </span>
                  <span className="founder-event__title">
                    {item.href ? (
                      <Link href={item.href}>{item.title}</Link>
                    ) : (
                      item.title
                    )}
                  </span>
                  {item.detail ? (
                    <span className="founder-event__detail">{item.detail}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-label="Состояние систем" className="founder-side">
          <div className="panel">
            <span className="panel__label">Проверка систем</span>
            <h2>Что подключено</h2>
            <ul className="founder-systems">
              {overview.systems.map((system) => (
                <li key={system.name}>
                  <span
                    className={`founder-dot${system.ok ? " founder-dot--ok" : " founder-dot--off"}`}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{system.name}</strong>
                    <em>{system.detail}</em>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <span className="panel__label">Доставка уведомлений</span>
            <h2>Последние сигналы команде</h2>
            <p>
              Доставлено: <strong>{overview.notificationHealth.sent}</strong> ·
              не доставлено:{" "}
              <strong>{overview.notificationHealth.failed}</strong> · не
              настроено: <strong>{overview.notificationHealth.skipped}</strong>
            </p>
            <p className="founder-hint">
              «Не настроено» означает, что Telegram-бот ещё не подключён —
              событие записано в базу, но в телефон не ушло.
            </p>
            <ErrorIsland title="Проверка Telegram">
              <TelegramSetupPanel />
            </ErrorIsland>
          </div>

          <div className="panel">
            <span className="panel__label">Рекомендации</span>
            <h2>Реферальная программа</h2>
            <p>
              Пришли по ссылкам клиентов: <strong>{referrals.totalReferred}</strong>{" "}
              · из них оплатили: <strong>{referrals.totalPaid}</strong>
            </p>
            {referrals.topReferrers.length > 0 ? (
              <ul className="founder-systems">
                {referrals.topReferrers.map((referrer, index) => (
                  <li key={`${referrer.email ?? "anon"}-${index}`}>
                    <span className="founder-dot founder-dot--ok" aria-hidden="true" />
                    <span>
                      <strong>{referrer.email ?? "клиент без email"}</strong>
                      <em>пригласил(а): {referrer.invited}</em>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="founder-hint">
                Приглашений пока нет. Код появляется у каждого клиента в кабинете
                автоматически.
              </p>
            )}
          </div>

          <div className="panel">
            <span className="panel__label">Разделы</span>
            <h2>Куда перейти</h2>
            <div className="panel-actions">
              <Link className="button button--secondary" href="/admin">
                Рабочая панель
              </Link>
              <Link className="button button--secondary" href="/admin/cases">
                Кейсы
              </Link>
              <Link className="button button--secondary" href="/admin/requests">
                Обращения
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
