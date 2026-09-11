import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { GapReadToggle } from "@/components/founder/GapReadToggle";
import { getFounderState } from "@/lib/auth/require-founder";
import {
  gapAudienceLabel,
  gapTargetLabel,
  gapTopicLabel,
  notificationsCopy
} from "@/lib/assistant/escalation-copy";
import { listGapEvents } from "@/lib/assistant/escalation-store";
import { formatDateTime } from "@/lib/i18n/format";
import { getLocale } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

// The founder's knowledge-gap centre.
//
// Founder-gated twice over: getFounderState requires the admin role AND the
// founder allowlist, and notFound() is used rather than a message so the
// route does not even confirm its own existence to anyone else.
export default async function FounderNotificationsPage() {
  const locale = await getLocale();
  const copy = notificationsCopy(locale);
  const auth = await getFounderState();

  if (auth.status === "forbidden" || auth.status === "unauthenticated") {
    notFound();
  }

  if (auth.status === "missing-env") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.setupText}
        />
        <p className="form-message form-message--error">
          {auth.missingEnvVars.join(", ")}
        </p>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.errorText}
        />
        <p className="form-message form-message--error">{auth.message}</p>
      </div>
    );
  }

  const result = await listGapEvents(auth.userId);
  const events = result.status === "ready" ? result.events : [];
  const unread = events.filter((event) => !event.read).length;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />

      {result.status === "error" ? (
        <div className="notice notice--warning">
          <span className="panel__label">{copy.errorTitle}</span>
          <h2>{copy.errorText}</h2>
        </div>
      ) : null}

      <section className="intake-section" aria-label={copy.listLabel}>
        <div className="panel">
          <span className="panel__label">
            {unread} {copy.unreadCount}
          </span>
          <h2>{copy.listLabel}</h2>

          {events.length === 0 ? (
            <p className="empty-state">{copy.empty}</p>
          ) : (
            <ul className="status-list">
              {events.map((event) => (
                <li key={event.id}>
                  <strong>{gapTopicLabel(event.topic, locale)}</strong>
                  {" — "}
                  {gapAudienceLabel(event.audience, locale)}
                  {" · "}
                  {gapTargetLabel(event.escalationTarget, locale)}
                  {" · "}
                  {formatDateTime(event.createdAt, locale)}
                  {" · "}
                  <b>{event.read ? copy.read : copy.unread}</b>{" "}
                  <Link
                    className="button button--secondary button--compact"
                    href={`/admin/notifications/${event.id}`}
                  >
                    {copy.open}
                  </Link>{" "}
                  <GapReadToggle
                    eventId={event.id}
                    labels={{ markRead: copy.markRead, markUnread: copy.markUnread }}
                    read={event.read}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="intake-section" aria-label={copy.privacyTitle}>
        <div className="panel">
          <span className="panel__label">{copy.privacyTitle}</span>
          <p>{copy.privacyText}</p>
        </div>
      </section>
    </div>
  );
}
